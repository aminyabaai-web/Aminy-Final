// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Developmental Wellness Score — Aminy's North Star Metric
 *
 * Like Bevel's "Biological Age" but for child development.
 * NOT a clinical assessment — it's a composite engagement + progress score
 * that shows parents their child is on a positive trajectory.
 *
 * CRITICAL: This score is personalized to each child's BASELINE, not
 * compared to neurotypical norms. A child with Level 3 autism reaching
 * 85% of THEIR goals is celebrated the same as a Level 1 child at 85%.
 * The score measures progress relative to the child's own starting point.
 *
 * Updates weekly. Confidence increases with more data.
 */

export interface WellnessScore {
  composite: number; // 0-100
  trend: number; // change from last week (+/-)
  trendDirection: 'up' | 'down' | 'stable';
  confidence: number; // 0-100 (how much data we have)
  confidenceLabel: string;
  lastUpdated: string;
  nextUpdate: string;
  domains: DomainScore[];
  insights: string[];
  celebration?: string;
}

export interface DomainScore {
  domain: string;
  icon: string;
  score: number; // 0-100 (relative to child's baseline)
  trend: number;
  trendLabel: string;
  color: string;
}

/**
 * Calculate the Developmental Wellness Score.
 *
 * Each domain is scored relative to the child's OWN baseline:
 * - 100 = achieving all current goals in this domain
 * - 50 = making steady progress at expected pace
 * - 0 = regression from baseline
 *
 * The composite is a weighted average based on which domains
 * are active in the child's care plan.
 */
export function calculateWellnessScore(data: {
  goalProgress: { domain: string; currentPct: number; baselinePct: number; targetPct: number }[];
  streakDays: number;
  activitiesThisWeek: number;
  calmCornerSessions: number;
  providerSessionsAttended: number;
  providerSessionsScheduled: number;
  parentEngagementDays: number; // out of 7
  incidentsTrend: number; // negative = fewer incidents = good
  lastWeekComposite?: number;
}): WellnessScore {
  const domains: DomainScore[] = [];

  // Goal-based domain scores (relative to child's own baseline→target range)
  const domainMap: Record<string, { scores: number[]; icon: string; color: string }> = {
    'Behavioral': { scores: [], icon: '⭐', color: '#4E93A8' },
    'Communication': { scores: [], icon: '💬', color: '#6AA9BC' },
    'Social': { scores: [], icon: '🤝', color: '#E07A5F' },
    'Sensory': { scores: [], icon: '🌈', color: '#D4A373' },
    'Executive': { scores: [], icon: '🧩', color: '#577590' },
    'Emotional': { scores: [], icon: '💛', color: '#F2CC8F' },
  };

  // Map goals to domains and calculate relative progress
  for (const goal of data.goalProgress) {
    const domainKey = Object.keys(domainMap).find(d =>
      goal.domain.toLowerCase().includes(d.toLowerCase())
    ) || 'Behavioral';

    // Score is progress from baseline toward target (0-100)
    const range = goal.targetPct - goal.baselinePct;
    const progress = goal.currentPct - goal.baselinePct;
    const relativeScore = range > 0 ? Math.min(100, Math.max(0, Math.round((progress / range) * 100))) : 50;

    domainMap[domainKey].scores.push(relativeScore);
  }

  // Calculate per-domain averages
  for (const [name, config] of Object.entries(domainMap)) {
    if (config.scores.length === 0) continue;
    const avg = Math.round(config.scores.reduce((a, b) => a + b, 0) / config.scores.length);
    domains.push({
      domain: name,
      icon: config.icon,
      score: avg,
      trend: 0, // would need historical data
      trendLabel: avg >= 70 ? 'Strong progress' : avg >= 40 ? 'Steady' : 'Needs focus',
      color: config.color,
    });
  }

  // Engagement score (0-100)
  const streakBonus = Math.min(20, data.streakDays * 2);
  const activityScore = Math.min(25, data.activitiesThisWeek * 3);
  const calmScore = Math.min(15, data.calmCornerSessions * 5);
  const attendanceScore = data.providerSessionsScheduled > 0
    ? Math.round((data.providerSessionsAttended / data.providerSessionsScheduled) * 20)
    : 10;
  const parentScore = Math.round((data.parentEngagementDays / 7) * 20);
  const engagementScore = Math.min(100, streakBonus + activityScore + calmScore + attendanceScore + parentScore);

  // Add engagement as a domain
  domains.push({
    domain: 'Engagement',
    icon: '🔥',
    score: engagementScore,
    trend: 0,
    trendLabel: engagementScore >= 70 ? 'Very active' : engagementScore >= 40 ? 'Moderate' : 'Getting started',
    color: '#4E93A8',
  });

  // Composite: weighted average of all domains
  const totalScore = domains.reduce((sum, d) => sum + d.score, 0);
  const composite = domains.length > 0 ? Math.round(totalScore / domains.length) : 50;

  // Trend
  const trend = data.lastWeekComposite !== undefined ? composite - data.lastWeekComposite : 0;
  const trendDirection = trend > 2 ? 'up' : trend < -2 ? 'down' : 'stable';

  // Confidence based on data completeness
  let confidence = 0;
  if (data.goalProgress.length > 0) confidence += 30;
  if (data.streakDays >= 3) confidence += 15;
  if (data.activitiesThisWeek >= 3) confidence += 15;
  if (data.providerSessionsAttended > 0) confidence += 20;
  if (data.parentEngagementDays >= 5) confidence += 10;
  if (data.goalProgress.length >= 3) confidence += 10;
  confidence = Math.min(100, confidence);

  let confidenceLabel: string;
  if (confidence >= 80) confidenceLabel = 'High-quality estimate';
  else if (confidence >= 50) confidenceLabel = 'Good estimate with some gaps';
  else if (confidence >= 25) confidenceLabel = 'Early estimate — keep tracking';
  else confidenceLabel = 'Not enough data yet';

  // Insights
  const insights: string[] = [];
  const topDomain = domains.reduce((best, d) => d.score > best.score ? d : best, domains[0]);
  const weakDomain = domains.reduce((worst, d) => d.score < worst.score ? d : worst, domains[0]);

  if (topDomain && topDomain.score >= 70) {
    insights.push(`${topDomain.icon} ${topDomain.domain} is your strongest area — ${topDomain.score}% of target`);
  }
  if (weakDomain && weakDomain.score < 40 && weakDomain !== topDomain) {
    insights.push(`${weakDomain.domain} could use more focus this week`);
  }
  if (data.streakDays >= 7) {
    insights.push(`🔥 ${data.streakDays}-day streak — consistency is your superpower`);
  }
  if (data.incidentsTrend < 0) {
    insights.push(`📉 Incidents trending down — strategies are working`);
  }

  // Celebration for high scores
  let celebration: string | undefined;
  if (composite >= 80) celebration = 'Outstanding week! Your consistency is paying off.';
  else if (trend >= 5) celebration = `Up ${trend} points from last week — great momentum!`;

  // Next update
  const nextSunday = new Date();
  const daysUntilSunday = (7 - nextSunday.getDay()) % 7 || 7;
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);

  return {
    composite,
    trend,
    trendDirection,
    confidence,
    confidenceLabel,
    lastUpdated: new Date().toISOString(),
    nextUpdate: `${daysUntilSunday} days`,
    domains,
    insights,
    celebration,
  };
}
