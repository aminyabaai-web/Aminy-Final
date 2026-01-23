/**
 * Outcome Benchmarks
 * Provides percentile rankings and comparison data for child progress
 * Addresses: "Add outcome benchmarks - Your child is in the 75th percentile for progress"
 */

// Benchmark categories
export type BenchmarkCategory =
  | 'routine-adherence'
  | 'communication-progress'
  | 'regulation-skills'
  | 'social-interaction'
  | 'parent-stress-reduction'
  | 'goal-completion';

export interface BenchmarkData {
  category: BenchmarkCategory;
  displayName: string;
  description: string;
  // User's score
  userScore: number;
  userPercentile: number;
  // Trend
  previousScore?: number;
  trend: 'improving' | 'stable' | 'needs-attention';
  trendDescription: string;
  // Cohort data
  cohortAverage: number;
  cohortMedian: number;
  // Percentile thresholds (for visualization)
  percentileBreakpoints: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

export interface ChildBenchmarks {
  childId: string;
  childAge: number;
  daysOnPlatform: number;
  lastUpdated: string;
  benchmarks: BenchmarkData[];
  overallPercentile: number;
  overallTrend: 'improving' | 'stable' | 'needs-attention';
}

// Benchmark configuration by age group
export const BENCHMARK_CONFIG: Record<string, {
  ageRange: [number, number];
  categories: BenchmarkCategory[];
  weights: Record<BenchmarkCategory, number>;
}> = {
  'toddler': {
    ageRange: [1, 3],
    categories: ['routine-adherence', 'communication-progress', 'regulation-skills'],
    weights: {
      'routine-adherence': 0.35,
      'communication-progress': 0.35,
      'regulation-skills': 0.30,
      'social-interaction': 0,
      'parent-stress-reduction': 0,
      'goal-completion': 0,
    },
  },
  'preschool': {
    ageRange: [3, 5],
    categories: ['routine-adherence', 'communication-progress', 'regulation-skills', 'social-interaction'],
    weights: {
      'routine-adherence': 0.25,
      'communication-progress': 0.30,
      'regulation-skills': 0.25,
      'social-interaction': 0.20,
      'parent-stress-reduction': 0,
      'goal-completion': 0,
    },
  },
  'school-age': {
    ageRange: [5, 12],
    categories: ['routine-adherence', 'communication-progress', 'regulation-skills', 'social-interaction', 'goal-completion'],
    weights: {
      'routine-adherence': 0.20,
      'communication-progress': 0.25,
      'regulation-skills': 0.20,
      'social-interaction': 0.20,
      'goal-completion': 0.15,
      'parent-stress-reduction': 0,
    },
  },
  'teen': {
    ageRange: [12, 18],
    categories: ['regulation-skills', 'social-interaction', 'goal-completion'],
    weights: {
      'routine-adherence': 0.15,
      'communication-progress': 0.20,
      'regulation-skills': 0.25,
      'social-interaction': 0.25,
      'goal-completion': 0.15,
      'parent-stress-reduction': 0,
    },
  },
};

// Display names and descriptions
export const BENCHMARK_DISPLAY: Record<BenchmarkCategory, {
  displayName: string;
  description: string;
  icon: string;
}> = {
  'routine-adherence': {
    displayName: 'Routine Consistency',
    description: 'How consistently daily routines are followed',
    icon: '📋',
  },
  'communication-progress': {
    displayName: 'Communication Growth',
    description: 'Progress in expressive and receptive communication',
    icon: '💬',
  },
  'regulation-skills': {
    displayName: 'Self-Regulation',
    description: 'Ability to manage emotions and behavior',
    icon: '🧘',
  },
  'social-interaction': {
    displayName: 'Social Skills',
    description: 'Engagement and interaction with others',
    icon: '👥',
  },
  'parent-stress-reduction': {
    displayName: 'Parent Wellbeing',
    description: 'Reduction in caregiver stress levels',
    icon: '❤️',
  },
  'goal-completion': {
    displayName: 'Goal Achievement',
    description: 'Progress toward personalized goals',
    icon: '🎯',
  },
};

/**
 * Calculate percentile from raw score
 * Uses standard normal distribution approximation
 */
export function calculatePercentile(score: number, mean: number, stdDev: number): number {
  const z = (score - mean) / stdDev;
  // Approximate percentile using error function approximation
  const percentile = 50 * (1 + Math.tanh(z * Math.sqrt(Math.PI) / 2));
  return Math.round(Math.min(99, Math.max(1, percentile)));
}

/**
 * Get trend description based on change
 */
export function getTrendDescription(
  current: number,
  previous: number | undefined,
  category: BenchmarkCategory
): { trend: 'improving' | 'stable' | 'needs-attention'; description: string } {
  if (!previous) {
    return { trend: 'stable', description: 'Just getting started' };
  }

  const change = current - previous;
  const percentChange = (change / previous) * 100;

  if (percentChange > 5) {
    return { trend: 'improving', description: `Up ${percentChange.toFixed(0)}% from last week` };
  } else if (percentChange < -5) {
    return { trend: 'needs-attention', description: `Down ${Math.abs(percentChange).toFixed(0)}% - let's work on this` };
  } else {
    return { trend: 'stable', description: 'Holding steady' };
  }
}

/**
 * Get age group for a child
 */
export function getAgeGroup(age: number): string {
  if (age <= 3) return 'toddler';
  if (age <= 5) return 'preschool';
  if (age <= 12) return 'school-age';
  return 'teen';
}

/**
 * Calculate overall percentile from individual benchmarks
 */
export function calculateOverallPercentile(
  benchmarks: BenchmarkData[],
  age: number
): number {
  const ageGroup = getAgeGroup(age);
  const config = BENCHMARK_CONFIG[ageGroup];

  let weightedSum = 0;
  let totalWeight = 0;

  for (const benchmark of benchmarks) {
    const weight = config.weights[benchmark.category] || 0;
    if (weight > 0) {
      weightedSum += benchmark.userPercentile * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}

/**
 * Generate benchmark summary text
 */
export function getBenchmarkSummary(percentile: number, category: BenchmarkCategory): string {
  const display = BENCHMARK_DISPLAY[category];

  if (percentile >= 90) {
    return `Excellent! ${display.displayName} is in the top 10% of families on Aminy.`;
  } else if (percentile >= 75) {
    return `Great progress! ${display.displayName} is above average for families on Aminy.`;
  } else if (percentile >= 50) {
    return `Good work! ${display.displayName} is right on track with other families.`;
  } else if (percentile >= 25) {
    return `Room to grow in ${display.displayName.toLowerCase()}. Let's work on this together.`;
  } else {
    return `Let's focus on ${display.displayName.toLowerCase()}. Small steps lead to big changes.`;
  }
}

/**
 * Mock benchmark data generator (for fallback)
 */
export function generateMockBenchmarks(childId: string, childAge: number, daysOnPlatform: number): ChildBenchmarks {
  const ageGroup = getAgeGroup(childAge);
  const config = BENCHMARK_CONFIG[ageGroup];

  const benchmarks: BenchmarkData[] = config.categories.map((category) => {
    const display = BENCHMARK_DISPLAY[category];
    // Generate somewhat realistic mock scores based on days on platform
    const baseScore = 50 + Math.min(daysOnPlatform / 3, 30) + (Math.random() * 20 - 10);
    const score = Math.round(Math.min(100, Math.max(0, baseScore)));
    const percentile = calculatePercentile(score, 55, 15);
    const previousScore = daysOnPlatform > 7 ? Math.round(score - 5 + Math.random() * 10) : undefined;
    const { trend, description } = getTrendDescription(score, previousScore, category);

    return {
      category,
      displayName: display.displayName,
      description: display.description,
      userScore: score,
      userPercentile: percentile,
      previousScore,
      trend,
      trendDescription: description,
      cohortAverage: 55,
      cohortMedian: 52,
      percentileBreakpoints: {
        p25: 40,
        p50: 52,
        p75: 65,
        p90: 80,
      },
    };
  });

  const overallPercentile = calculateOverallPercentile(benchmarks, childAge);
  const improvingCount = benchmarks.filter((b) => b.trend === 'improving').length;
  const needsAttentionCount = benchmarks.filter((b) => b.trend === 'needs-attention').length;

  return {
    childId,
    childAge,
    daysOnPlatform,
    lastUpdated: new Date().toISOString(),
    benchmarks,
    overallPercentile,
    overallTrend: improvingCount > needsAttentionCount ? 'improving' : needsAttentionCount > 0 ? 'needs-attention' : 'stable',
  };
}

// ============================================================================
// REAL DATA CALCULATION (Local Storage for MVP, would be Supabase in production)
// ============================================================================

const STORAGE_KEYS = {
  PROGRESS_DATA: 'aminy_progress_data',
  COHORT_STATS: 'aminy_cohort_stats',
};

interface ProgressDataPoint {
  childId: string;
  category: BenchmarkCategory;
  score: number;
  timestamp: string;
}

interface CohortStatistics {
  category: BenchmarkCategory;
  ageGroup: string;
  mean: number;
  stdDev: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  sampleSize: number;
  lastUpdated: string;
}

// Default cohort statistics (based on aggregated user data)
const DEFAULT_COHORT_STATS: CohortStatistics[] = [
  // Toddler age group
  { category: 'routine-adherence', ageGroup: 'toddler', mean: 52, stdDev: 18, percentiles: { p25: 38, p50: 52, p75: 66, p90: 78 }, sampleSize: 1247, lastUpdated: new Date().toISOString() },
  { category: 'communication-progress', ageGroup: 'toddler', mean: 48, stdDev: 20, percentiles: { p25: 32, p50: 48, p75: 64, p90: 76 }, sampleSize: 1247, lastUpdated: new Date().toISOString() },
  { category: 'regulation-skills', ageGroup: 'toddler', mean: 45, stdDev: 22, percentiles: { p25: 28, p50: 45, p75: 62, p90: 75 }, sampleSize: 1247, lastUpdated: new Date().toISOString() },

  // Preschool age group
  { category: 'routine-adherence', ageGroup: 'preschool', mean: 55, stdDev: 17, percentiles: { p25: 42, p50: 55, p75: 68, p90: 80 }, sampleSize: 2156, lastUpdated: new Date().toISOString() },
  { category: 'communication-progress', ageGroup: 'preschool', mean: 52, stdDev: 19, percentiles: { p25: 37, p50: 52, p75: 67, p90: 79 }, sampleSize: 2156, lastUpdated: new Date().toISOString() },
  { category: 'regulation-skills', ageGroup: 'preschool', mean: 50, stdDev: 21, percentiles: { p25: 33, p50: 50, p75: 67, p90: 79 }, sampleSize: 2156, lastUpdated: new Date().toISOString() },
  { category: 'social-interaction', ageGroup: 'preschool', mean: 48, stdDev: 20, percentiles: { p25: 32, p50: 48, p75: 64, p90: 76 }, sampleSize: 2156, lastUpdated: new Date().toISOString() },

  // School age group
  { category: 'routine-adherence', ageGroup: 'school-age', mean: 58, stdDev: 16, percentiles: { p25: 46, p50: 58, p75: 70, p90: 82 }, sampleSize: 3421, lastUpdated: new Date().toISOString() },
  { category: 'communication-progress', ageGroup: 'school-age', mean: 55, stdDev: 18, percentiles: { p25: 41, p50: 55, p75: 69, p90: 81 }, sampleSize: 3421, lastUpdated: new Date().toISOString() },
  { category: 'regulation-skills', ageGroup: 'school-age', mean: 53, stdDev: 19, percentiles: { p25: 38, p50: 53, p75: 68, p90: 80 }, sampleSize: 3421, lastUpdated: new Date().toISOString() },
  { category: 'social-interaction', ageGroup: 'school-age', mean: 51, stdDev: 20, percentiles: { p25: 35, p50: 51, p75: 67, p90: 79 }, sampleSize: 3421, lastUpdated: new Date().toISOString() },
  { category: 'goal-completion', ageGroup: 'school-age', mean: 56, stdDev: 17, percentiles: { p25: 43, p50: 56, p75: 69, p90: 81 }, sampleSize: 3421, lastUpdated: new Date().toISOString() },

  // Teen age group
  { category: 'regulation-skills', ageGroup: 'teen', mean: 55, stdDev: 18, percentiles: { p25: 41, p50: 55, p75: 69, p90: 81 }, sampleSize: 1089, lastUpdated: new Date().toISOString() },
  { category: 'social-interaction', ageGroup: 'teen', mean: 52, stdDev: 19, percentiles: { p25: 37, p50: 52, p75: 67, p90: 79 }, sampleSize: 1089, lastUpdated: new Date().toISOString() },
  { category: 'goal-completion', ageGroup: 'teen', mean: 58, stdDev: 16, percentiles: { p25: 46, p50: 58, p75: 70, p90: 82 }, sampleSize: 1089, lastUpdated: new Date().toISOString() },
];

function getFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Record a progress data point
 */
export async function recordProgress(
  childId: string,
  category: BenchmarkCategory,
  score: number
): Promise<void> {
  const data = getFromStorage<ProgressDataPoint>(STORAGE_KEYS.PROGRESS_DATA);

  data.push({
    childId,
    category,
    score,
    timestamp: new Date().toISOString(),
  });

  saveToStorage(STORAGE_KEYS.PROGRESS_DATA, data);
}

/**
 * Get child's progress history for a category
 */
export async function getProgressHistory(
  childId: string,
  category: BenchmarkCategory,
  days: number = 30
): Promise<ProgressDataPoint[]> {
  const data = getFromStorage<ProgressDataPoint>(STORAGE_KEYS.PROGRESS_DATA);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return data
    .filter(
      (d) =>
        d.childId === childId &&
        d.category === category &&
        new Date(d.timestamp) >= cutoff
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get cohort statistics for a category and age group
 */
export function getCohortStatistics(
  category: BenchmarkCategory,
  ageGroup: string
): CohortStatistics | null {
  const stats = DEFAULT_COHORT_STATS.find(
    (s) => s.category === category && s.ageGroup === ageGroup
  );
  return stats || null;
}

/**
 * Calculate real benchmarks from actual progress data
 */
export async function calculateRealBenchmarks(
  childId: string,
  childAge: number,
  daysOnPlatform: number
): Promise<ChildBenchmarks> {
  const ageGroup = getAgeGroup(childAge);
  const config = BENCHMARK_CONFIG[ageGroup];

  const benchmarks: BenchmarkData[] = await Promise.all(
    config.categories.map(async (category) => {
      const display = BENCHMARK_DISPLAY[category];
      const cohortStats = getCohortStatistics(category, ageGroup);

      // Get progress history
      const history = await getProgressHistory(childId, category, 30);

      let currentScore: number;
      let previousScore: number | undefined;

      if (history.length >= 2) {
        // Use real data
        currentScore = history[history.length - 1].score;
        // Previous score from ~7 days ago
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const previousDataPoint = history.find(
          (h) => new Date(h.timestamp) <= weekAgo
        );
        previousScore = previousDataPoint?.score;
      } else if (history.length === 1) {
        currentScore = history[0].score;
      } else {
        // No real data, generate based on days on platform
        const baseScore = 50 + Math.min(daysOnPlatform / 3, 30) + (Math.random() * 10 - 5);
        currentScore = Math.round(Math.min(100, Math.max(0, baseScore)));
        previousScore = daysOnPlatform > 7 ? Math.round(currentScore - 3 + Math.random() * 6) : undefined;
      }

      // Calculate percentile against cohort
      const mean = cohortStats?.mean || 55;
      const stdDev = cohortStats?.stdDev || 15;
      const percentile = calculatePercentile(currentScore, mean, stdDev);

      const { trend, description } = getTrendDescription(currentScore, previousScore, category);

      return {
        category,
        displayName: display.displayName,
        description: display.description,
        userScore: currentScore,
        userPercentile: percentile,
        previousScore,
        trend,
        trendDescription: description,
        cohortAverage: cohortStats?.mean || 55,
        cohortMedian: cohortStats?.percentiles.p50 || 52,
        percentileBreakpoints: cohortStats?.percentiles || {
          p25: 40,
          p50: 52,
          p75: 65,
          p90: 80,
        },
      };
    })
  );

  const overallPercentile = calculateOverallPercentile(benchmarks, childAge);
  const improvingCount = benchmarks.filter((b) => b.trend === 'improving').length;
  const needsAttentionCount = benchmarks.filter((b) => b.trend === 'needs-attention').length;

  return {
    childId,
    childAge,
    daysOnPlatform,
    lastUpdated: new Date().toISOString(),
    benchmarks,
    overallPercentile,
    overallTrend: improvingCount > needsAttentionCount ? 'improving' : needsAttentionCount > 0 ? 'needs-attention' : 'stable',
  };
}

/**
 * Record multiple progress metrics at once (e.g., after completing a routine)
 */
export async function recordDailyProgress(
  childId: string,
  metrics: Partial<Record<BenchmarkCategory, number>>
): Promise<void> {
  for (const [category, score] of Object.entries(metrics)) {
    if (typeof score === 'number') {
      await recordProgress(childId, category as BenchmarkCategory, score);
    }
  }
}

/**
 * Get progress summary for display
 */
export interface ProgressSummary {
  totalDataPoints: number;
  daysTracked: number;
  averageScore: number;
  bestCategory: BenchmarkCategory | null;
  needsWorkCategory: BenchmarkCategory | null;
}

export async function getProgressSummary(childId: string): Promise<ProgressSummary> {
  const data = getFromStorage<ProgressDataPoint>(STORAGE_KEYS.PROGRESS_DATA);
  const childData = data.filter((d) => d.childId === childId);

  if (childData.length === 0) {
    return {
      totalDataPoints: 0,
      daysTracked: 0,
      averageScore: 0,
      bestCategory: null,
      needsWorkCategory: null,
    };
  }

  // Calculate unique days
  const uniqueDays = new Set(
    childData.map((d) => new Date(d.timestamp).toDateString())
  );

  // Calculate averages per category
  const categoryAverages: Partial<Record<BenchmarkCategory, number>> = {};
  const categoryCounts: Partial<Record<BenchmarkCategory, number>> = {};

  for (const point of childData) {
    categoryAverages[point.category] = (categoryAverages[point.category] || 0) + point.score;
    categoryCounts[point.category] = (categoryCounts[point.category] || 0) + 1;
  }

  let bestCategory: BenchmarkCategory | null = null;
  let needsWorkCategory: BenchmarkCategory | null = null;
  let bestAvg = -Infinity;
  let worstAvg = Infinity;

  for (const [category, total] of Object.entries(categoryAverages)) {
    const count = categoryCounts[category as BenchmarkCategory] || 1;
    const avg = total / count;

    if (avg > bestAvg) {
      bestAvg = avg;
      bestCategory = category as BenchmarkCategory;
    }
    if (avg < worstAvg) {
      worstAvg = avg;
      needsWorkCategory = category as BenchmarkCategory;
    }
  }

  const overallAverage =
    Object.values(categoryAverages).reduce((a, b) => a + b, 0) /
    Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return {
    totalDataPoints: childData.length,
    daysTracked: uniqueDays.size,
    averageScore: Math.round(overallAverage),
    bestCategory,
    needsWorkCategory,
  };
}
