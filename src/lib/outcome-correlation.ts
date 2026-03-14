/**
 * Outcome Correlation Engine
 *
 * Computes statistical correlations between Aminy app usage patterns and
 * clinical outcomes tracked in CentralReach. This is the core evidence layer
 * that proves Aminy drives measurable improvement — the single strongest
 * signal for an acquirer like CentralReach/Roper Technologies.
 *
 * Correlation vectors:
 *   1. Junior session frequency/accuracy  →  clinical goal progress (from CR)
 *   2. Calm Corner usage                  →  behavior incident reduction
 *   3. Parent engagement (sessions/week)  →  treatment plan adherence
 *   4. Community participation             →  caregiver wellbeing scores
 *
 * All computation is local-first (Supabase + cached CR data). The engine
 * produces an OutcomesReport JSON that can be:
 *   - Rendered in the parent dashboard
 *   - Shared with providers via CR push
 *   - Aggregated for acquisition due diligence
 *   - Exported as a PDF (WeeklyOutcomesPDF)
 */

import { supabase } from '../utils/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

/** A single correlation between an Aminy feature and a clinical outcome. */
export interface CorrelationResult {
  /** Unique identifier for this correlation (e.g. 'junior_to_goal_progress') */
  id: string;
  /** Human-readable label */
  label: string;
  /** Aminy feature being measured */
  featureMetric: FeatureMetric;
  /** Clinical outcome being measured */
  outcomeMetric: OutcomeMetric;
  /** Pearson correlation coefficient (-1 to 1) */
  coefficient: number;
  /** Statistical significance (p-value, lower = more significant) */
  pValue: number;
  /** Whether the correlation is statistically significant (p < 0.05) */
  isSignificant: boolean;
  /** Number of data points used */
  sampleSize: number;
  /** Confidence interval [lower, upper] */
  confidenceInterval: [number, number];
  /** Plain-language interpretation */
  interpretation: string;
  /** Direction: positive means more feature usage = better outcomes */
  direction: 'positive' | 'negative' | 'none';
}

/** Aggregated report across all correlation vectors. */
export interface OutcomesReport {
  /** Report generation timestamp */
  generatedAt: string;
  /** User ID */
  userId: string;
  /** Child ID (if child-specific) */
  childId?: string;
  /** Reporting period */
  period: {
    start: string;
    end: string;
    durationDays: number;
  };
  /** Individual correlation results */
  correlations: CorrelationResult[];
  /** Overall outcome improvement score (0-100) */
  overallImprovementScore: number;
  /** Feature engagement summary */
  engagementSummary: EngagementSummary;
  /** Clinical progress summary (from CR data) */
  clinicalSummary: ClinicalSummary;
  /** Actionable recommendations based on correlations */
  recommendations: Recommendation[];
  /** Data quality indicators */
  dataQuality: DataQualityReport;
}

export interface EngagementSummary {
  juniorSessionsPerWeek: number;
  juniorAvgAccuracy: number;
  calmCornerUsesPerWeek: number;
  parentSessionsPerWeek: number;
  communityInteractionsPerWeek: number;
  routineAdherenceRate: number;
  totalActiveWeeks: number;
}

export interface ClinicalSummary {
  activeGoals: number;
  goalsImproved: number;
  goalsMastered: number;
  avgGoalProgress: number;
  behaviorIncidentsPerWeek: number;
  behaviorIncidentTrend: 'decreasing' | 'stable' | 'increasing';
  treatmentAdherenceRate: number;
  caregiverWellnessScore: number;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'engagement' | 'clinical' | 'wellness';
  title: string;
  description: string;
  /** Which correlation drives this recommendation */
  basedOn: string;
}

export interface DataQualityReport {
  /** Minimum data points needed for reliable correlations */
  minimumSampleSize: number;
  /** Whether we have enough data */
  hasSufficientData: boolean;
  /** Data freshness — last data point timestamp */
  lastDataPoint: string | null;
  /** Percentage of expected data points actually present */
  completenessScore: number;
  /** Issues that may affect accuracy */
  warnings: string[];
}

// Feature metrics tracked in Aminy
export type FeatureMetric =
  | 'junior_sessions_per_week'
  | 'junior_avg_accuracy'
  | 'calm_corner_uses_per_week'
  | 'parent_sessions_per_week'
  | 'community_interactions_per_week'
  | 'routine_adherence_rate'
  | 'ask_aminy_queries_per_week'
  | 'home_program_completion_rate';

// Clinical outcome metrics (from CR or local tracking)
export type OutcomeMetric =
  | 'goal_progress_rate'
  | 'behavior_incident_rate'
  | 'treatment_adherence_rate'
  | 'caregiver_wellness_score'
  | 'prompt_level_reduction'
  | 'skill_generalization_rate'
  | 'independence_score';

// Internal: time-series data point
interface TimeSeriesPoint {
  weekStart: string; // ISO date of week start
  value: number;
}

// Internal: paired data for correlation
interface PairedSeries {
  feature: TimeSeriesPoint[];
  outcome: TimeSeriesPoint[];
  aligned: Array<{ week: string; featureValue: number; outcomeValue: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_SAMPLE_SIZE = 4; // Minimum weeks of data for any correlation
const SIGNIFICANCE_THRESHOLD = 0.05; // p < 0.05
const CONFIDENCE_LEVEL = 0.95;

// Correlation vector definitions
const CORRELATION_VECTORS = [
  {
    id: 'junior_to_goal_progress',
    label: 'Junior Sessions → Goal Progress',
    feature: 'junior_sessions_per_week' as FeatureMetric,
    outcome: 'goal_progress_rate' as OutcomeMetric,
    expectedDirection: 'positive' as const,
  },
  {
    id: 'junior_accuracy_to_goals',
    label: 'Junior Accuracy → Treatment Goals',
    feature: 'junior_avg_accuracy' as FeatureMetric,
    outcome: 'goal_progress_rate' as OutcomeMetric,
    expectedDirection: 'positive' as const,
  },
  {
    id: 'calm_corner_to_incidents',
    label: 'Calm Corner Usage → Behavior Incidents',
    feature: 'calm_corner_uses_per_week' as FeatureMetric,
    outcome: 'behavior_incident_rate' as OutcomeMetric,
    expectedDirection: 'negative' as const, // more usage = fewer incidents
  },
  {
    id: 'parent_engagement_to_adherence',
    label: 'Parent Engagement → Treatment Adherence',
    feature: 'parent_sessions_per_week' as FeatureMetric,
    outcome: 'treatment_adherence_rate' as OutcomeMetric,
    expectedDirection: 'positive' as const,
  },
  {
    id: 'community_to_wellness',
    label: 'Community Participation → Caregiver Wellness',
    feature: 'community_interactions_per_week' as FeatureMetric,
    outcome: 'caregiver_wellness_score' as OutcomeMetric,
    expectedDirection: 'positive' as const,
  },
  {
    id: 'routine_to_independence',
    label: 'Routine Adherence → Independence Score',
    feature: 'routine_adherence_rate' as FeatureMetric,
    outcome: 'independence_score' as OutcomeMetric,
    expectedDirection: 'positive' as const,
  },
  {
    id: 'home_program_to_prompt_reduction',
    label: 'Home Program Completion → Prompt Level Reduction',
    feature: 'home_program_completion_rate' as FeatureMetric,
    outcome: 'prompt_level_reduction' as OutcomeMetric,
    expectedDirection: 'positive' as const,
  },
] as const;

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

/** Compute Pearson correlation coefficient between two arrays. */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  if (denominator === 0) return 0;

  return sumXY / denominator;
}

/**
 * Approximate p-value for Pearson r using the t-distribution.
 * Uses the t-statistic: t = r * sqrt((n-2) / (1-r^2))
 * Then approximates the two-tailed p-value.
 */
function pValueForPearson(r: number, n: number): number {
  if (n < 3) return 1;
  if (Math.abs(r) >= 1) return 0;

  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;

  // Approximate two-tailed p-value using regularized incomplete beta function
  // For simplicity, use the well-known approximation for large df
  const x = df / (df + t * t);
  return incompleteBeta(df / 2, 0.5, x);
}

/**
 * Regularized incomplete beta function approximation.
 * Used for p-value computation from the t-distribution.
 */
function incompleteBeta(a: number, b: number, x: number): number {
  // Simple series expansion — sufficient for our df range (4-52 weeks)
  if (x < 0 || x > 1) return x < 0 ? 0 : 1;
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use continued fraction for better convergence when x > (a+1)/(a+b+2)
  const threshold = (a + 1) / (a + b + 2);
  if (x > threshold) {
    return 1 - incompleteBeta(b, a, 1 - x);
  }

  // Series expansion
  const lnBeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  let sum = 1;
  let term = 1;
  for (let n = 1; n <= 200; n++) {
    term *= ((n - b) * x) / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }

  return front * sum;
}

/** Log-gamma function (Stirling approximation for positive values). */
function gammaLn(z: number): number {
  if (z <= 0) return 0;
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i - 1);
  }

  const t = z + g - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z - 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Compute confidence interval for Pearson r using Fisher z-transformation.
 */
function confidenceIntervalForR(
  r: number,
  n: number,
  confidence: number = CONFIDENCE_LEVEL,
): [number, number] {
  if (n < 4) return [-1, 1];

  // Fisher z-transformation
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const se = 1 / Math.sqrt(n - 3);

  // Z critical value for the given confidence level
  const alpha = 1 - confidence;
  const zCritical = normalQuantile(1 - alpha / 2);

  const zLower = z - zCritical * se;
  const zUpper = z + zCritical * se;

  // Inverse Fisher transformation
  const rLower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
  const rUpper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);

  return [
    Math.max(-1, Math.round(rLower * 1000) / 1000),
    Math.min(1, Math.round(rUpper * 1000) / 1000),
  ];
}

/** Approximate inverse normal CDF (Beasley-Springer-Moro algorithm). */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

/** Compute linear trend direction from time series. */
function trendDirection(values: number[]): 'decreasing' | 'stable' | 'increasing' {
  if (values.length < 3) return 'stable';

  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  const slope = pearsonCorrelation(indices, values);

  if (slope > 0.2) return 'increasing';
  if (slope < -0.2) return 'decreasing';
  return 'stable';
}

// ============================================================================
// DATA RETRIEVAL
// ============================================================================

/**
 * Fetch weekly feature usage metrics from Supabase analytics tables.
 */
async function fetchFeatureMetrics(
  userId: string,
  childId: string | undefined,
  startDate: string,
  endDate: string,
): Promise<Map<FeatureMetric, TimeSeriesPoint[]>> {
  const metrics = new Map<FeatureMetric, TimeSeriesPoint[]>();

  try {
    // Junior session data
    const { data: juniorData } = await supabase
      .from('analytics_events')
      .select('created_at, metadata')
      .eq('user_id', userId)
      .eq('event_type', 'junior_session_complete')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (juniorData) {
      const weeklyJunior = aggregateToWeekly(
        juniorData.map((d) => ({
          date: d.created_at,
          value: 1, // count per session
        })),
        'sum',
      );
      metrics.set('junior_sessions_per_week', weeklyJunior);

      const weeklyAccuracy = aggregateToWeekly(
        juniorData
          .filter((d) => d.metadata?.accuracy != null)
          .map((d) => ({
            date: d.created_at,
            value: (d.metadata as Record<string, number>).accuracy,
          })),
        'average',
      );
      metrics.set('junior_avg_accuracy', weeklyAccuracy);
    }

    // Calm Corner usage
    const { data: calmData } = await supabase
      .from('analytics_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'calm_tool_used')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (calmData) {
      metrics.set(
        'calm_corner_uses_per_week',
        aggregateToWeekly(
          calmData.map((d) => ({ date: d.created_at, value: 1 })),
          'sum',
        ),
      );
    }

    // Parent app sessions
    const { data: sessionData } = await supabase
      .from('analytics_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'app_session_start')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (sessionData) {
      metrics.set(
        'parent_sessions_per_week',
        aggregateToWeekly(
          sessionData.map((d) => ({ date: d.created_at, value: 1 })),
          'sum',
        ),
      );
    }

    // Community interactions
    const { data: communityData } = await supabase
      .from('analytics_events')
      .select('created_at')
      .eq('user_id', userId)
      .in('event_type', ['community_post_created', 'community_comment', 'community_reaction'])
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (communityData) {
      metrics.set(
        'community_interactions_per_week',
        aggregateToWeekly(
          communityData.map((d) => ({ date: d.created_at, value: 1 })),
          'sum',
        ),
      );
    }

    // Routine adherence
    const { data: routineData } = await supabase
      .from('analytics_events')
      .select('created_at, metadata')
      .eq('user_id', userId)
      .eq('event_type', 'routine_completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (routineData) {
      metrics.set(
        'routine_adherence_rate',
        aggregateToWeekly(
          routineData.map((d) => ({
            date: d.created_at,
            value: (d.metadata as Record<string, number>)?.completion_rate ?? 100,
          })),
          'average',
        ),
      );
    }

    // Home program completion
    const { data: homeProgramData } = await supabase
      .from('analytics_events')
      .select('created_at, metadata')
      .eq('user_id', userId)
      .eq('event_type', 'home_program_activity_completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (homeProgramData) {
      metrics.set(
        'home_program_completion_rate',
        aggregateToWeekly(
          homeProgramData.map((d) => ({
            date: d.created_at,
            value: (d.metadata as Record<string, number>)?.completion_rate ?? 100,
          })),
          'average',
        ),
      );
    }
  } catch (err) {
    console.error('[OutcomeCorrelation] Error fetching feature metrics:', err);
  }

  return metrics;
}

/**
 * Fetch weekly clinical outcome metrics from CR sync data + local tracking.
 */
async function fetchOutcomeMetrics(
  userId: string,
  childId: string | undefined,
  startDate: string,
  endDate: string,
): Promise<Map<OutcomeMetric, TimeSeriesPoint[]>> {
  const metrics = new Map<OutcomeMetric, TimeSeriesPoint[]>();

  try {
    // Goal progress from CR-synced data
    const { data: goalData } = await supabase
      .from('outcome_events')
      .select('created_at, metric_value')
      .eq('user_id', userId)
      .eq('event_type', 'goal_progress')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (goalData) {
      metrics.set(
        'goal_progress_rate',
        aggregateToWeekly(
          goalData.map((d) => ({ date: d.created_at, value: d.metric_value })),
          'average',
        ),
      );
    }

    // Behavior incidents
    const { data: incidentData } = await supabase
      .from('outcome_events')
      .select('created_at, metric_value')
      .eq('user_id', userId)
      .eq('event_type', 'behavior_incident')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (incidentData) {
      metrics.set(
        'behavior_incident_rate',
        aggregateToWeekly(
          incidentData.map((d) => ({ date: d.created_at, value: d.metric_value })),
          'sum',
        ),
      );
    }

    // Treatment adherence (from routine completions + session attendance)
    const { data: adherenceData } = await supabase
      .from('outcome_events')
      .select('created_at, metric_value')
      .eq('user_id', userId)
      .in('event_type', ['routine_adherence', 'session_attended'])
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (adherenceData) {
      metrics.set(
        'treatment_adherence_rate',
        aggregateToWeekly(
          adherenceData.map((d) => ({ date: d.created_at, value: d.metric_value })),
          'average',
        ),
      );
    }

    // Caregiver wellness
    const { data: wellnessData } = await supabase
      .from('outcome_events')
      .select('created_at, metric_value')
      .eq('user_id', userId)
      .eq('event_type', 'caregiver_stress')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (wellnessData) {
      // Invert stress (1-10) to wellness (0-100): wellness = (10 - stress) * 10 + 10
      metrics.set(
        'caregiver_wellness_score',
        aggregateToWeekly(
          wellnessData.map((d) => ({
            date: d.created_at,
            value: Math.max(0, Math.min(100, (10 - d.metric_value) * 10 + 10)),
          })),
          'average',
        ),
      );
    }

    // Prompt level reduction (from Junior session data)
    const { data: promptData } = await supabase
      .from('outcome_events')
      .select('created_at, metric_value')
      .eq('user_id', userId)
      .eq('event_type', 'skill_acquisition')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (promptData) {
      metrics.set(
        'prompt_level_reduction',
        aggregateToWeekly(
          promptData.map((d) => ({ date: d.created_at, value: d.metric_value })),
          'average',
        ),
      );
    }

    // Independence score (composite of routine independence + session independence)
    const { data: independenceData } = await supabase
      .from('outcome_events')
      .select('created_at, metric_value')
      .eq('user_id', userId)
      .in('event_type', ['transition_success', 'routine_adherence'])
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (independenceData) {
      metrics.set(
        'independence_score',
        aggregateToWeekly(
          independenceData.map((d) => ({ date: d.created_at, value: d.metric_value })),
          'average',
        ),
      );
    }
  } catch (err) {
    console.error('[OutcomeCorrelation] Error fetching outcome metrics:', err);
  }

  return metrics;
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

/** Get ISO week start (Monday) for a given date string. */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(date);
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/** Aggregate raw data points into weekly time series. */
function aggregateToWeekly(
  dataPoints: Array<{ date: string; value: number }>,
  method: 'sum' | 'average',
): TimeSeriesPoint[] {
  const weekMap = new Map<string, number[]>();

  for (const dp of dataPoints) {
    const week = getWeekStart(dp.date);
    if (!weekMap.has(week)) weekMap.set(week, []);
    weekMap.get(week)!.push(dp.value);
  }

  const result: TimeSeriesPoint[] = [];
  for (const [weekStart, values] of weekMap) {
    const value =
      method === 'sum'
        ? values.reduce((a, b) => a + b, 0)
        : values.reduce((a, b) => a + b, 0) / values.length;
    result.push({ weekStart, value: Math.round(value * 100) / 100 });
  }

  return result.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/** Align two time series by week, keeping only overlapping weeks. */
function alignSeries(
  feature: TimeSeriesPoint[],
  outcome: TimeSeriesPoint[],
): PairedSeries {
  const featureMap = new Map(feature.map((f) => [f.weekStart, f.value]));
  const outcomeMap = new Map(outcome.map((o) => [o.weekStart, o.value]));

  const commonWeeks = [...featureMap.keys()].filter((w) => outcomeMap.has(w)).sort();

  return {
    feature,
    outcome,
    aligned: commonWeeks.map((week) => ({
      week,
      featureValue: featureMap.get(week)!,
      outcomeValue: outcomeMap.get(week)!,
    })),
  };
}

// ============================================================================
// CORRELATION ENGINE
// ============================================================================

/**
 * Compute a single correlation between a feature metric and outcome metric.
 */
function computeCorrelation(
  vector: (typeof CORRELATION_VECTORS)[number],
  featureSeries: TimeSeriesPoint[] | undefined,
  outcomeSeries: TimeSeriesPoint[] | undefined,
): CorrelationResult {
  const noData: CorrelationResult = {
    id: vector.id,
    label: vector.label,
    featureMetric: vector.feature,
    outcomeMetric: vector.outcome,
    coefficient: 0,
    pValue: 1,
    isSignificant: false,
    sampleSize: 0,
    confidenceInterval: [-1, 1],
    interpretation: 'Insufficient data to compute correlation.',
    direction: 'none',
  };

  if (!featureSeries?.length || !outcomeSeries?.length) return noData;

  const paired = alignSeries(featureSeries, outcomeSeries);
  const n = paired.aligned.length;

  if (n < MIN_SAMPLE_SIZE) {
    return {
      ...noData,
      sampleSize: n,
      interpretation: `Need at least ${MIN_SAMPLE_SIZE} weeks of overlapping data (have ${n}).`,
    };
  }

  const featureValues = paired.aligned.map((d) => d.featureValue);
  const outcomeValues = paired.aligned.map((d) => d.outcomeValue);

  const r = pearsonCorrelation(featureValues, outcomeValues);
  const p = pValueForPearson(r, n);
  const ci = confidenceIntervalForR(r, n);
  const isSignificant = p < SIGNIFICANCE_THRESHOLD;

  // Determine direction accounting for expected direction
  let direction: 'positive' | 'negative' | 'none' = 'none';
  if (Math.abs(r) > 0.1) {
    direction = r > 0 ? 'positive' : 'negative';
  }

  // Generate interpretation
  const strength =
    Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.4 ? 'moderate' : Math.abs(r) > 0.2 ? 'weak' : 'negligible';

  let interpretation: string;
  if (!isSignificant) {
    interpretation = `A ${strength} correlation (r=${r.toFixed(2)}) was observed but is not statistically significant (p=${p.toFixed(3)}).`;
  } else if (vector.expectedDirection === 'negative' && r < 0) {
    interpretation = `Significant ${strength} inverse correlation (r=${r.toFixed(2)}, p=${p.toFixed(3)}): higher ${vector.feature.replace(/_/g, ' ')} is associated with lower ${vector.outcome.replace(/_/g, ' ')}.`;
  } else if (vector.expectedDirection === 'positive' && r > 0) {
    interpretation = `Significant ${strength} positive correlation (r=${r.toFixed(2)}, p=${p.toFixed(3)}): higher ${vector.feature.replace(/_/g, ' ')} is associated with better ${vector.outcome.replace(/_/g, ' ')}.`;
  } else {
    interpretation = `Unexpected ${strength} correlation (r=${r.toFixed(2)}, p=${p.toFixed(3)}). Further investigation recommended.`;
  }

  return {
    id: vector.id,
    label: vector.label,
    featureMetric: vector.feature,
    outcomeMetric: vector.outcome,
    coefficient: Math.round(r * 1000) / 1000,
    pValue: Math.round(p * 10000) / 10000,
    isSignificant,
    sampleSize: n,
    confidenceInterval: ci,
    interpretation,
    direction,
  };
}

// ============================================================================
// RECOMMENDATIONS ENGINE
// ============================================================================

function generateRecommendations(
  correlations: CorrelationResult[],
  engagement: EngagementSummary,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Find significant positive correlations with low engagement
  for (const corr of correlations) {
    if (!corr.isSignificant) continue;

    if (
      corr.featureMetric === 'junior_sessions_per_week' &&
      engagement.juniorSessionsPerWeek < 3
    ) {
      recommendations.push({
        id: 'increase_junior',
        priority: 'high',
        category: 'engagement',
        title: 'Increase Ease Sessions',
        description:
          'Data shows Ease sessions correlate with goal progress. Try adding 1-2 more sessions per week.',
        basedOn: corr.id,
      });
    }

    if (
      corr.featureMetric === 'calm_corner_uses_per_week' &&
      corr.direction === 'negative' &&
      engagement.calmCornerUsesPerWeek < 2
    ) {
      recommendations.push({
        id: 'use_calm_corner',
        priority: 'high',
        category: 'clinical',
        title: 'Practice Calm Corner Regularly',
        description:
          'Calm Corner usage is linked to fewer behavior incidents. Practice 2-3 times per week for best results.',
        basedOn: corr.id,
      });
    }

    if (
      corr.featureMetric === 'community_interactions_per_week' &&
      engagement.communityInteractionsPerWeek < 1
    ) {
      recommendations.push({
        id: 'join_community',
        priority: 'medium',
        category: 'wellness',
        title: 'Connect with the Community',
        description:
          'Community participation is linked to caregiver wellness. Try posting or commenting once this week.',
        basedOn: corr.id,
      });
    }

    if (
      corr.featureMetric === 'home_program_completion_rate' &&
      engagement.routineAdherenceRate < 60
    ) {
      recommendations.push({
        id: 'improve_home_program',
        priority: 'high',
        category: 'clinical',
        title: 'Focus on Home Program Activities',
        description:
          'Home program completion is correlated with prompt level reduction. Even partial completion helps.',
        basedOn: corr.id,
      });
    }
  }

  // General engagement recommendation if no significant correlations yet
  if (correlations.every((c) => !c.isSignificant)) {
    recommendations.push({
      id: 'build_data',
      priority: 'medium',
      category: 'engagement',
      title: 'Keep Using Aminy Consistently',
      description:
        'We need a few more weeks of data to show how your app usage connects to clinical outcomes. Keep going!',
      basedOn: 'data_quality',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a complete outcomes correlation report for a user/child.
 *
 * @param userId - Supabase user ID
 * @param childId - Optional child ID for child-specific analysis
 * @param periodWeeks - Number of weeks to analyze (default: 12)
 */
export async function generateOutcomesReport(
  userId: string,
  childId?: string,
  periodWeeks: number = 12,
): Promise<OutcomesReport> {
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - periodWeeks * 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const durationDays = periodWeeks * 7;

  // Fetch all data in parallel
  const [featureMetrics, outcomeMetrics] = await Promise.all([
    fetchFeatureMetrics(userId, childId, startDate, endDate),
    fetchOutcomeMetrics(userId, childId, startDate, endDate),
  ]);

  // Compute all correlations
  const correlations = CORRELATION_VECTORS.map((vector) =>
    computeCorrelation(
      vector,
      featureMetrics.get(vector.feature),
      outcomeMetrics.get(vector.outcome),
    ),
  );

  // Build engagement summary
  const avg = (series: TimeSeriesPoint[] | undefined): number => {
    if (!series?.length) return 0;
    return Math.round((series.reduce((a, b) => a + b.value, 0) / series.length) * 10) / 10;
  };

  const engagementSummary: EngagementSummary = {
    juniorSessionsPerWeek: avg(featureMetrics.get('junior_sessions_per_week')),
    juniorAvgAccuracy: avg(featureMetrics.get('junior_avg_accuracy')),
    calmCornerUsesPerWeek: avg(featureMetrics.get('calm_corner_uses_per_week')),
    parentSessionsPerWeek: avg(featureMetrics.get('parent_sessions_per_week')),
    communityInteractionsPerWeek: avg(featureMetrics.get('community_interactions_per_week')),
    routineAdherenceRate: avg(featureMetrics.get('routine_adherence_rate')),
    totalActiveWeeks: Math.max(
      ...[...featureMetrics.values()].map((s) => s.length),
      0,
    ),
  };

  // Build clinical summary
  const incidentSeries = outcomeMetrics.get('behavior_incident_rate') ?? [];
  const incidentValues = incidentSeries.map((p) => p.value);

  const clinicalSummary: ClinicalSummary = {
    activeGoals: 0, // Will be enriched by CR data if available
    goalsImproved: 0,
    goalsMastered: 0,
    avgGoalProgress: avg(outcomeMetrics.get('goal_progress_rate')),
    behaviorIncidentsPerWeek: avg(outcomeMetrics.get('behavior_incident_rate')),
    behaviorIncidentTrend: trendDirection(incidentValues),
    treatmentAdherenceRate: avg(outcomeMetrics.get('treatment_adherence_rate')),
    caregiverWellnessScore: avg(outcomeMetrics.get('caregiver_wellness_score')),
  };

  // Enrich clinical summary with CR goal counts
  try {
    const { data: goals } = await supabase
      .from('cr_goals')
      .select('status, current_level, baseline')
      .eq('user_id', userId);

    if (goals) {
      clinicalSummary.activeGoals = goals.filter((g) => g.status === 'active').length;
      clinicalSummary.goalsMastered = goals.filter((g) => g.status === 'mastered').length;
      clinicalSummary.goalsImproved = goals.filter(
        (g) => g.current_level > g.baseline,
      ).length;
    }
  } catch {
    // Non-critical — use defaults
  }

  // Compute overall improvement score (0-100)
  const significantPositive = correlations.filter(
    (c) => c.isSignificant && c.coefficient > 0.2,
  ).length;
  const totalSignificant = correlations.filter((c) => c.isSignificant).length;
  const engagementScore =
    (engagementSummary.parentSessionsPerWeek > 0 ? 20 : 0) +
    (engagementSummary.juniorSessionsPerWeek > 2 ? 20 : engagementSummary.juniorSessionsPerWeek > 0 ? 10 : 0) +
    (engagementSummary.calmCornerUsesPerWeek > 0 ? 10 : 0) +
    (engagementSummary.communityInteractionsPerWeek > 0 ? 10 : 0) +
    (engagementSummary.routineAdherenceRate > 70 ? 15 : engagementSummary.routineAdherenceRate > 40 ? 8 : 0) +
    (clinicalSummary.behaviorIncidentTrend === 'decreasing' ? 15 : 0) +
    (significantPositive > 0 ? 10 : 0);
  const overallImprovementScore = Math.min(100, engagementScore);

  // Data quality assessment
  const allSampleSizes = correlations.map((c) => c.sampleSize);
  const maxSampleSize = Math.max(...allSampleSizes, 0);
  const allDates = [
    ...([...featureMetrics.values()].flatMap((s) => s.map((p) => p.weekStart))),
    ...([...outcomeMetrics.values()].flatMap((s) => s.map((p) => p.weekStart))),
  ];
  const lastDataPoint = allDates.length > 0 ? allDates.sort().reverse()[0] : null;

  const dataQuality: DataQualityReport = {
    minimumSampleSize: MIN_SAMPLE_SIZE,
    hasSufficientData: maxSampleSize >= MIN_SAMPLE_SIZE,
    lastDataPoint,
    completenessScore: Math.min(100, Math.round((maxSampleSize / periodWeeks) * 100)),
    warnings: [
      ...(maxSampleSize < MIN_SAMPLE_SIZE
        ? [`Need ${MIN_SAMPLE_SIZE - maxSampleSize} more weeks of data for reliable correlations.`]
        : []),
      ...(totalSignificant === 0 && maxSampleSize >= MIN_SAMPLE_SIZE
        ? ['No statistically significant correlations found yet. This may improve with more data.']
        : []),
      ...(!lastDataPoint
        ? ['No data points found. Ensure analytics events are being tracked.']
        : []),
    ],
  };

  // Generate recommendations
  const recommendations = generateRecommendations(correlations, engagementSummary);

  return {
    generatedAt: new Date().toISOString(),
    userId,
    childId,
    period: {
      start: startDate,
      end: endDate,
      durationDays,
    },
    correlations,
    overallImprovementScore,
    engagementSummary,
    clinicalSummary,
    recommendations,
    dataQuality,
  };
}

/**
 * Get a quick summary of outcome correlations (lighter than full report).
 * Useful for dashboard widgets.
 */
export async function getCorrelationSummary(
  userId: string,
  childId?: string,
): Promise<{
  improvementScore: number;
  significantCorrelations: number;
  topCorrelation: CorrelationResult | null;
  topRecommendation: Recommendation | null;
}> {
  const report = await generateOutcomesReport(userId, childId, 8);

  const significantCorrelations = report.correlations.filter((c) => c.isSignificant);
  const topCorrelation =
    significantCorrelations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))[0] ?? null;

  return {
    improvementScore: report.overallImprovementScore,
    significantCorrelations: significantCorrelations.length,
    topCorrelation,
    topRecommendation: report.recommendations[0] ?? null,
  };
}

// ============================================================================
// EXPORT FOR CR PUSH
// ============================================================================

/**
 * Format the outcomes report as a CentralReach-compatible clinical note payload.
 * This can be pushed to CR via the integration layer for provider visibility.
 */
export function formatForCRPush(report: OutcomesReport): {
  noteType: string;
  period: string;
  summary: string;
  correlations: Array<{ metric: string; correlation: number; significant: boolean }>;
  recommendations: string[];
  overallScore: number;
} {
  return {
    noteType: 'aminy_outcomes_report',
    period: `${report.period.start.slice(0, 10)} to ${report.period.end.slice(0, 10)}`,
    summary: `Aminy Outcomes Report: ${report.correlations.filter((c) => c.isSignificant).length} significant correlations found. Overall improvement score: ${report.overallImprovementScore}/100.`,
    correlations: report.correlations.map((c) => ({
      metric: c.label,
      correlation: c.coefficient,
      significant: c.isSignificant,
    })),
    recommendations: report.recommendations.map((r) => `[${r.priority.toUpperCase()}] ${r.title}: ${r.description}`),
    overallScore: report.overallImprovementScore,
  };
}
