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
 * Mock benchmark data generator (replace with real data in production)
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
