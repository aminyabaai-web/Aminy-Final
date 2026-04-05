// operational-metrics.ts — Types and utility functions for operational KPIs
// across family retention, telehealth liquidity, provider launch, and payer/EVV proof.

// ─── Family Retention ────────────────────────────────────────────────

export interface ChurnReason {
  reason: string;
  percentage: number;
}

export interface RetentionByTier {
  starter: number;
  core: number;
  pro: number;
}

export interface FamilyRetentionMetrics {
  totalActiveFamilies: number;
  newFamiliesThisPeriod: number;
  churnedFamiliesThisPeriod: number;
  retentionRate: number;         // 0-100
  retentionRatePrior: number;    // prior period for trend
  retention30Day: number;
  retention60Day: number;
  retention90Day: number;
  churnRate: number;             // 0-100
  churnReasons: ChurnReason[];
  retentionByTier: RetentionByTier;
  nps: number;                   // -100 to 100
  npsPrior: number;
  averageTenureDays: number;
  cohortAnalysis: CohortData[];
  monthlyRetention: TimeSeriesPoint[];
}

export interface CohortData {
  cohortMonth: string;           // e.g. "2026-01"
  startCount: number;
  retainedByMonth: number[];     // retention count at month 1, 2, 3...
  retentionRateByMonth: number[]; // percentage at month 1, 2, 3...
}

// ─── Telehealth Liquidity ────────────────────────────────────────────

export interface ServiceTypeLiquidity {
  aba: number;
  mentalHealth: number;
  speech: number;
}

export interface TelehealthLiquidityMetrics {
  activeProviders: number;
  activeProvidersPrior: number;
  availableHoursThisWeek: number;
  bookedHoursThisWeek: number;
  fillRate: number;              // 0-100 (booked / available)
  averageWaitTimeDays: number;
  averageWaitTimeMins: number;
  averageWaitTimePrior: number;
  completionRate: number;         // 0-100 (sessions completed / scheduled)
  completionRatePrior: number;
  cancelRate: number;
  noShowRate: number;
  utilizationRate: number;        // 0-100 (booked / available)
  utilizationRatePrior: number;
  byServiceType: ServiceTypeLiquidity;
  peakHoursDescription: string;
  peakHours: Array<{ hour: number; utilization: number }>;
  weeklyTrend: TimeSeriesPoint[];
}

// ─── Provider Launch ─────────────────────────────────────────────────

export interface ProviderCountByType {
  bcba: number;
  lcsw: number;
  slp: number;
}

export interface ProviderLaunchMetrics {
  providersOnboarded: number;
  averageDaysToLaunch: number;
  averageDaysToLaunchPrior: number;
  averageDaysToFirstSession: number;
  averageDaysTo10thSession: number;
  providerSatisfaction: number;     // 0-5
  providerRetention6Month: number;  // 0-100
  topComplaint: string;
  byType: ProviderCountByType;
  credentialingSuccessRate: number;  // 0-100
  credentialingSuccessRatePrior: number;
  funnel: ProviderFunnelStage[];
  activeOnboarding: number;
  completedThisPeriod: number;
  droppedThisPeriod: number;
  bottlenecks: Array<{ stage: string; averageDays: number; dropRate: number }>;
  monthlyLaunches: TimeSeriesPoint[];
}

export interface ProviderFunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
  averageDays: number;
}

// ─── Payer / EVV Operational Proof ───────────────────────────────────

export interface DenialReason {
  reason: string;
  percentage: number;
  count: number;
}

export interface PayerEVVMetrics {
  cleanClaimRate: number;          // 0-100
  cleanClaimRatePrior: number;
  denialRate: number;              // 0-100
  denialRatePrior: number;
  appealSuccessRate: number;       // 0-100
  appealSuccessRatePrior: number;
  averageDaysToPayment: number;
  averageDaysToPaymentPrior: number;
  evvComplianceRate: number;       // 0-100
  evvMatchRate: number;            // 0-100
  cleanCycles: number;             // consecutive clean billing cycles
  fiscalAgentConfidenceScore: number; // 0-100
  totalClaimsThisPeriod: number;
  totalDollarsBilled: number;
  totalDollarsCollected: number;
  topDenialReasons: DenialReason[];
  payerBreakdown: Array<{ payer: string; claimCount: number; cleanRate: number; avgDays: number }>;
  monthlyTrend: TimeSeriesPoint[];
}

// ─── Overall Health Score ────────────────────────────────────────────

export interface OverallHealthScore {
  composite: number;               // 0-100
  status: 'healthy' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  weights: {
    retention: number;             // 0.30
    liquidity: number;             // 0.25
    launch: number;                // 0.20
    payer: number;                 // 0.25
  };
  componentScores: {
    retention: number;
    liquidity: number;
    launch: number;
    payer: number;
  };
}

// ─── Alert ───────────────────────────────────────────────────────────

export interface OperationalAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'retention' | 'liquidity' | 'launch' | 'payer';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
}

// ─── Shared Types ────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

export interface KPICard {
  label: string;
  value: number | string;
  unit?: string;
  trend: 'up' | 'down' | 'flat';
  trendValue?: number;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

// ─── Combined Dashboard Data ─────────────────────────────────────────

export interface OperationalMetricsData {
  dateRange: DateRange;
  familyRetention: FamilyRetentionMetrics;
  telehealthLiquidity: TelehealthLiquidityMetrics;
  providerLaunch: ProviderLaunchMetrics;
  payerEVV: PayerEVVMetrics;
  overallHealth: OverallHealthScore;
  alerts: OperationalAlert[];
}

// ─── Utility Functions ───────────────────────────────────────────────

export function calculateRetentionRate(startCount: number, endCount: number, newCount: number): number {
  if (startCount === 0) return 0;
  const retained = endCount - newCount;
  return Math.round((retained / startCount) * 10000) / 100;
}

export function calculateChurnRate(startCount: number, churnedCount: number): number {
  if (startCount === 0) return 0;
  return Math.round((churnedCount / startCount) * 10000) / 100;
}

export function calculateNPS(promoters: number, detractors: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((promoters - detractors) / total) * 100);
}

export function trendDirection(current: number, prior: number): 'up' | 'down' | 'flat' {
  const delta = current - prior;
  if (Math.abs(delta) < 0.5) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export function trendPercentage(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 10000) / 100;
}

export function kpiStatus(value: number, thresholds: { good: number; warning: number }, higherIsBetter = true): 'good' | 'warning' | 'critical' {
  if (higherIsBetter) {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'critical';
  }
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.warning) return 'warning';
  return 'critical';
}

export function buildRetentionKPIs(data: FamilyRetentionMetrics): KPICard[] {
  return [
    {
      label: 'Retention Rate',
      value: data.retentionRate,
      unit: '%',
      trend: trendDirection(data.retentionRate, data.retentionRatePrior),
      trendValue: trendPercentage(data.retentionRate, data.retentionRatePrior),
      status: kpiStatus(data.retentionRate, { good: 90, warning: 80 }),
    },
    {
      label: 'Active Families',
      value: data.totalActiveFamilies,
      trend: trendDirection(data.totalActiveFamilies, data.totalActiveFamilies - data.newFamiliesThisPeriod + data.churnedFamiliesThisPeriod),
      trendValue: data.newFamiliesThisPeriod - data.churnedFamiliesThisPeriod,
      status: 'neutral',
    },
    {
      label: 'NPS',
      value: data.nps,
      trend: trendDirection(data.nps, data.npsPrior),
      trendValue: data.nps - data.npsPrior,
      status: kpiStatus(data.nps, { good: 50, warning: 20 }),
    },
    {
      label: 'Churn Rate',
      value: data.churnRate,
      unit: '%',
      trend: trendDirection(data.churnRate, data.churnRate),
      status: kpiStatus(data.churnRate, { good: 3, warning: 7 }, false),
    },
  ];
}

export function buildTelehealthKPIs(data: TelehealthLiquidityMetrics): KPICard[] {
  return [
    {
      label: 'Active Providers',
      value: data.activeProviders,
      trend: trendDirection(data.activeProviders, data.activeProvidersPrior),
      trendValue: data.activeProviders - data.activeProvidersPrior,
      status: kpiStatus(data.activeProviders, { good: 20, warning: 10 }),
    },
    {
      label: 'Fill Rate',
      value: data.fillRate,
      unit: '%',
      trend: trendDirection(data.fillRate, data.utilizationRatePrior),
      trendValue: trendPercentage(data.fillRate, data.utilizationRatePrior),
      status: kpiStatus(data.fillRate, { good: 85, warning: 70 }),
    },
    {
      label: 'Completion Rate',
      value: data.completionRate,
      unit: '%',
      trend: trendDirection(data.completionRate, data.completionRatePrior),
      trendValue: trendPercentage(data.completionRate, data.completionRatePrior),
      status: kpiStatus(data.completionRate, { good: 90, warning: 80 }),
    },
    {
      label: 'No-Show Rate',
      value: data.noShowRate,
      unit: '%',
      trend: 'down' as const,
      status: kpiStatus(data.noShowRate, { good: 5, warning: 10 }, false),
    },
  ];
}

export function buildProviderLaunchKPIs(data: ProviderLaunchMetrics): KPICard[] {
  return [
    {
      label: 'Days to Launch',
      value: data.averageDaysToLaunch,
      unit: 'days',
      trend: trendDirection(data.averageDaysToLaunch, data.averageDaysToLaunchPrior),
      trendValue: trendPercentage(data.averageDaysToLaunch, data.averageDaysToLaunchPrior),
      status: kpiStatus(data.averageDaysToLaunch, { good: 14, warning: 30 }, false),
    },
    {
      label: 'Credential Success',
      value: data.credentialingSuccessRate,
      unit: '%',
      trend: trendDirection(data.credentialingSuccessRate, data.credentialingSuccessRatePrior),
      status: kpiStatus(data.credentialingSuccessRate, { good: 90, warning: 75 }),
    },
    {
      label: 'Provider Satisfaction',
      value: `${data.providerSatisfaction}/5`,
      trend: trendDirection(data.providerSatisfaction, 4.0),
      status: kpiStatus(data.providerSatisfaction, { good: 4.0, warning: 3.5 }),
    },
    {
      label: '6-Mo Retention',
      value: data.providerRetention6Month,
      unit: '%',
      trend: 'up' as const,
      status: kpiStatus(data.providerRetention6Month, { good: 80, warning: 65 }),
    },
  ];
}

export function buildPayerEVVKPIs(data: PayerEVVMetrics): KPICard[] {
  return [
    {
      label: 'Clean Claim Rate',
      value: data.cleanClaimRate,
      unit: '%',
      trend: trendDirection(data.cleanClaimRate, data.cleanClaimRatePrior),
      trendValue: trendPercentage(data.cleanClaimRate, data.cleanClaimRatePrior),
      status: kpiStatus(data.cleanClaimRate, { good: 95, warning: 85 }),
    },
    {
      label: 'EVV Match Rate',
      value: data.evvMatchRate,
      unit: '%',
      trend: 'up' as const,
      status: kpiStatus(data.evvMatchRate, { good: 95, warning: 85 }),
    },
    {
      label: 'Days to Payment',
      value: data.averageDaysToPayment,
      unit: 'days',
      trend: trendDirection(data.averageDaysToPayment, data.averageDaysToPaymentPrior),
      status: kpiStatus(data.averageDaysToPayment, { good: 30, warning: 45 }, false),
    },
    {
      label: 'Fiscal Confidence',
      value: data.fiscalAgentConfidenceScore,
      unit: '/100',
      trend: 'up' as const,
      status: kpiStatus(data.fiscalAgentConfidenceScore, { good: 80, warning: 60 }),
    },
  ];
}

// ─── Overall Health Calculator ───────────────────────────────────────

export function calculateOverallHealth(data: Omit<OperationalMetricsData, 'overallHealth' | 'alerts' | 'dateRange'>): OverallHealthScore {
  const weights = { retention: 0.30, liquidity: 0.25, launch: 0.20, payer: 0.25 };

  // Normalize each category to 0-100
  const retentionScore = data.familyRetention.retentionRate;
  const liquidityScore = data.telehealthLiquidity.fillRate;
  // For launch, lower days is better; normalize: 100 - (days/60)*100, clamped
  const launchScore = Math.max(0, Math.min(100, 100 - (data.providerLaunch.averageDaysToLaunch / 60) * 100));
  const payerScore = data.payerEVV.cleanClaimRate;

  const composite = Math.round(
    retentionScore * weights.retention +
    liquidityScore * weights.liquidity +
    launchScore * weights.launch +
    payerScore * weights.payer
  );

  let status: 'healthy' | 'warning' | 'critical';
  if (composite >= 80) status = 'healthy';
  else if (composite >= 60) status = 'warning';
  else status = 'critical';

  // Compare to a prior-period proxy
  const priorRetention = data.familyRetention.retentionRatePrior;
  const priorLiquidity = data.telehealthLiquidity.utilizationRatePrior;
  const priorLaunch = Math.max(0, Math.min(100, 100 - (data.providerLaunch.averageDaysToLaunchPrior / 60) * 100));
  const priorPayer = data.payerEVV.cleanClaimRatePrior;
  const priorComposite = Math.round(
    priorRetention * weights.retention +
    priorLiquidity * weights.liquidity +
    priorLaunch * weights.launch +
    priorPayer * weights.payer
  );

  let trend: 'improving' | 'stable' | 'declining';
  const delta = composite - priorComposite;
  if (delta > 2) trend = 'improving';
  else if (delta < -2) trend = 'declining';
  else trend = 'stable';

  return {
    composite,
    status,
    trend,
    weights,
    componentScores: {
      retention: Math.round(retentionScore),
      liquidity: Math.round(liquidityScore),
      launch: Math.round(launchScore),
      payer: Math.round(payerScore),
    },
  };
}

// ─── Alert Generator ─────────────────────────────────────────────────

export function generateAlerts(data: Omit<OperationalMetricsData, 'alerts' | 'overallHealth' | 'dateRange'>): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  if (data.familyRetention.retentionRate < 80) {
    alerts.push({
      id: 'retention-low',
      severity: 'warning',
      category: 'retention',
      message: `Family retention at ${data.familyRetention.retentionRate}% — below 80% target`,
      metric: 'retentionRate',
      currentValue: data.familyRetention.retentionRate,
      threshold: 80,
    });
  }

  if (data.familyRetention.churnRate > 7) {
    alerts.push({
      id: 'churn-high',
      severity: 'critical',
      category: 'retention',
      message: `Churn rate at ${data.familyRetention.churnRate}% — above 7% critical threshold`,
      metric: 'churnRate',
      currentValue: data.familyRetention.churnRate,
      threshold: 7,
    });
  }

  if (data.telehealthLiquidity.fillRate < 70) {
    alerts.push({
      id: 'fill-rate-low',
      severity: 'warning',
      category: 'liquidity',
      message: `Telehealth fill rate at ${data.telehealthLiquidity.fillRate}% — provider hours underutilized`,
      metric: 'fillRate',
      currentValue: data.telehealthLiquidity.fillRate,
      threshold: 70,
    });
  }

  if (data.telehealthLiquidity.noShowRate > 10) {
    alerts.push({
      id: 'noshow-high',
      severity: 'warning',
      category: 'liquidity',
      message: `No-show rate at ${data.telehealthLiquidity.noShowRate}% — consider reminder automation`,
      metric: 'noShowRate',
      currentValue: data.telehealthLiquidity.noShowRate,
      threshold: 10,
    });
  }

  if (data.providerLaunch.averageDaysToLaunch > 30) {
    alerts.push({
      id: 'launch-slow',
      severity: 'warning',
      category: 'launch',
      message: `Provider launch taking ${data.providerLaunch.averageDaysToLaunch} days — above 30-day target`,
      metric: 'averageDaysToLaunch',
      currentValue: data.providerLaunch.averageDaysToLaunch,
      threshold: 30,
    });
  }

  if (data.payerEVV.cleanClaimRate < 90) {
    alerts.push({
      id: 'clean-claim-low',
      severity: 'critical',
      category: 'payer',
      message: `Clean claim rate at ${data.payerEVV.cleanClaimRate}% — revenue at risk`,
      metric: 'cleanClaimRate',
      currentValue: data.payerEVV.cleanClaimRate,
      threshold: 90,
    });
  }

  if (data.payerEVV.evvMatchRate < 90) {
    alerts.push({
      id: 'evv-match-low',
      severity: 'warning',
      category: 'payer',
      message: `EVV match rate at ${data.payerEVV.evvMatchRate}% — compliance risk`,
      metric: 'evvMatchRate',
      currentValue: data.payerEVV.evvMatchRate,
      threshold: 90,
    });
  }

  if (data.payerEVV.denialRate > 10) {
    alerts.push({
      id: 'denial-high',
      severity: 'critical',
      category: 'payer',
      message: `Denial rate at ${data.payerEVV.denialRate}% — above 10% critical threshold`,
      metric: 'denialRate',
      currentValue: data.payerEVV.denialRate,
      threshold: 10,
    });
  }

  return alerts;
}

// ─── Sparkline Data Helper ───────────────────────────────────────────

export function normalizeSparkline(points: TimeSeriesPoint[]): number[] {
  if (points.length === 0) return [];
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map(v => (v - min) / range);
}

// ─── Date Range Presets ──────────────────────────────────────────────

export function getDateRangePresets(): DateRange[] {
  const now = new Date();

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const thisQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
  const thisQuarterStart = new Date(now.getFullYear(), thisQuarterMonth, 1);

  return [
    { start: fmt(thisMonthStart), end: fmt(now), label: 'This Month' },
    { start: fmt(lastMonthStart), end: fmt(lastMonthEnd), label: 'Last Month' },
    { start: fmt(thisQuarterStart), end: fmt(now), label: 'This Quarter' },
    { start: fmt(new Date(now.getFullYear(), 0, 1)), end: fmt(now), label: 'Year to Date' },
    {
      start: fmt(new Date(now.getTime() - 90 * 86400000)),
      end: fmt(now),
      label: 'Last 90 Days',
    },
  ];
}

// ─── Executive Summary Generator ────────────────────────────────────

export interface ExecutiveSummary {
  headline: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
  topWins: string[];
  topRisks: string[];
  actionItems: string[];
  investorReady: boolean;
  investorReadyReasons: string[];
}

export function generateExecutiveSummary(data: OperationalMetricsData): ExecutiveSummary {
  const wins: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];

  // Family retention analysis
  if (data.familyRetention.retentionRate >= 85) {
    wins.push(`Family retention at ${data.familyRetention.retentionRate}% — strong product-market fit`);
  }
  if (data.familyRetention.nps >= 50) {
    wins.push(`NPS of ${data.familyRetention.nps} — families are promoters`);
  }
  if (data.familyRetention.churnRate > 5) {
    risks.push(`Churn rate ${data.familyRetention.churnRate}% needs attention`);
    actions.push('Analyze top churn reasons and create targeted retention campaigns');
  }

  // Telehealth liquidity analysis
  if (data.telehealthLiquidity.fillRate >= 85) {
    wins.push(`Telehealth fill rate ${data.telehealthLiquidity.fillRate}% — strong provider-family matching`);
  }
  if (data.telehealthLiquidity.completionRate >= 90) {
    wins.push(`Session completion rate ${data.telehealthLiquidity.completionRate}%`);
  }
  if (data.telehealthLiquidity.noShowRate > 8) {
    risks.push(`No-show rate ${data.telehealthLiquidity.noShowRate}% above target`);
    actions.push('Implement 24hr + 1hr appointment reminders via push + SMS');
  }

  // Provider launch analysis
  if (data.providerLaunch.averageDaysToLaunch <= 21) {
    wins.push(`Provider launch in ${data.providerLaunch.averageDaysToLaunch} days — competitive with Headway`);
  } else {
    risks.push(`Provider launch taking ${data.providerLaunch.averageDaysToLaunch} days`);
    actions.push('Streamline credentialing bottleneck — target 14 days');
  }

  // Payer/EVV analysis
  if (data.payerEVV.cleanClaimRate >= 93) {
    wins.push(`Clean claim rate ${data.payerEVV.cleanClaimRate}% — revenue cycle healthy`);
  }
  if (data.payerEVV.evvMatchRate >= 95) {
    wins.push(`EVV match rate ${data.payerEVV.evvMatchRate}% — Medicaid compliant`);
  }
  if (data.payerEVV.denialRate > 8) {
    risks.push(`Denial rate ${data.payerEVV.denialRate}% leaking revenue`);
    actions.push('Deploy AI denial ops with auto-appeal for top 3 CARC codes');
  }

  // Investor readiness check
  const investorReadyReasons: string[] = [];
  const investorChecks = [
    { check: data.familyRetention.retentionRate >= 80, reason: 'Family retention above 80%' },
    { check: data.telehealthLiquidity.fillRate >= 75, reason: 'Telehealth liquidity proven' },
    { check: data.providerLaunch.credentialingSuccessRate >= 85, reason: 'Credentialing pipeline working' },
    { check: data.payerEVV.cleanClaimRate >= 90, reason: 'Revenue cycle clean' },
    { check: data.familyRetention.nps >= 40, reason: 'Strong NPS' },
    { check: data.overallHealth.trend !== 'declining', reason: 'Metrics trending up or stable' },
  ];

  for (const { check, reason } of investorChecks) {
    if (check) investorReadyReasons.push(reason);
  }

  const investorReady = investorReadyReasons.length >= 5;

  const headline = data.overallHealth.status === 'healthy'
    ? `Platform health score: ${data.overallHealth.composite}/100 — All systems healthy`
    : data.overallHealth.status === 'warning'
      ? `Platform health score: ${data.overallHealth.composite}/100 — Attention needed`
      : `Platform health score: ${data.overallHealth.composite}/100 — Critical issues`;

  return { headline, healthStatus: data.overallHealth.status, topWins: wins, topRisks: risks, actionItems: actions, investorReady, investorReadyReasons };
}

// ─── CSV Export ──────────────────────────────────────────────────────

export function exportMetricsToCSV(data: OperationalMetricsData): string {
  const rows: string[][] = [
    ['Category', 'Metric', 'Value', 'Unit', 'Status'],
  ];

  const allKPIs = [
    ...buildRetentionKPIs(data.familyRetention).map(k => ['Retention', k.label, String(k.value), k.unit ?? '', k.status]),
    ...buildTelehealthKPIs(data.telehealthLiquidity).map(k => ['Telehealth', k.label, String(k.value), k.unit ?? '', k.status]),
    ...buildProviderLaunchKPIs(data.providerLaunch).map(k => ['Provider', k.label, String(k.value), k.unit ?? '', k.status]),
    ...buildPayerEVVKPIs(data.payerEVV).map(k => ['Payer/EVV', k.label, String(k.value), k.unit ?? '', k.status]),
  ];

  rows.push(...allKPIs);
  return rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
}

// ─── Demo Data Generator ─────────────────────────────────────────────

export function generateDemoOperationalData(): OperationalMetricsData {
  const familyRetention: FamilyRetentionMetrics = {
    totalActiveFamilies: 312,
    newFamiliesThisPeriod: 28,
    churnedFamiliesThisPeriod: 9,
    retentionRate: 87,
    retentionRatePrior: 84,
    retention30Day: 87,
    retention60Day: 78,
    retention90Day: 72,
    churnRate: 2.9,
    churnReasons: [
      { reason: 'Cost', percentage: 25 },
      { reason: 'Other', percentage: 25 },
      { reason: 'Child graduated', percentage: 20 },
      { reason: 'Found other provider', percentage: 15 },
      { reason: 'Moved', percentage: 10 },
      { reason: 'Dissatisfied', percentage: 5 },
    ],
    retentionByTier: { starter: 72, core: 88, pro: 94 },
    nps: 72,
    npsPrior: 65,
    averageTenureDays: 142,
    cohortAnalysis: [
      { cohortMonth: '2026-01', startCount: 45, retainedByMonth: [42, 38, 35], retentionRateByMonth: [93, 84, 78, 0, 0, 72] },
      { cohortMonth: '2025-12', startCount: 38, retainedByMonth: [36, 33, 30, 28], retentionRateByMonth: [95, 87, 79, 74, 0, 70] },
      { cohortMonth: '2025-11', startCount: 41, retainedByMonth: [39, 35, 32, 29, 27], retentionRateByMonth: [95, 85, 78, 71, 66, 63] },
      { cohortMonth: '2025-10', startCount: 36, retainedByMonth: [34, 31, 28, 26, 24, 22], retentionRateByMonth: [94, 86, 78, 72, 67, 61] },
    ],
    monthlyRetention: [
      { date: '2025-10', value: 81 },
      { date: '2025-11', value: 82 },
      { date: '2025-12', value: 83 },
      { date: '2026-01', value: 84 },
      { date: '2026-02', value: 85 },
      { date: '2026-03', value: 87 },
    ],
  };

  const telehealthLiquidity: TelehealthLiquidityMetrics = {
    activeProviders: 45,
    activeProvidersPrior: 39,
    availableHoursThisWeek: 320,
    bookedHoursThisWeek: 285,
    fillRate: 89,
    averageWaitTimeDays: 2.3,
    averageWaitTimeMins: 4.2,
    averageWaitTimePrior: 6.1,
    completionRate: 92,
    completionRatePrior: 89,
    cancelRate: 5.1,
    noShowRate: 8,
    utilizationRate: 89,
    utilizationRatePrior: 82,
    byServiceType: { aba: 92, mentalHealth: 87, speech: 85 },
    peakHoursDescription: 'Mon-Thu 3-6pm',
    peakHours: [
      { hour: 9, utilization: 78 },
      { hour: 10, utilization: 94 },
      { hour: 14, utilization: 91 },
      { hour: 15, utilization: 96 },
      { hour: 16, utilization: 88 },
    ],
    weeklyTrend: [
      { date: '2026-03-03', value: 84 },
      { date: '2026-03-10', value: 86 },
      { date: '2026-03-17', value: 88 },
      { date: '2026-03-24', value: 89 },
      { date: '2026-03-31', value: 92 },
    ],
  };

  const providerLaunch: ProviderLaunchMetrics = {
    providersOnboarded: 28,
    averageDaysToLaunch: 18,
    averageDaysToLaunchPrior: 22,
    averageDaysToFirstSession: 18,
    averageDaysTo10thSession: 45,
    providerSatisfaction: 4.2,
    providerRetention6Month: 85,
    topComplaint: 'Need more client volume',
    byType: { bcba: 15, lcsw: 8, slp: 5 },
    credentialingSuccessRate: 91,
    credentialingSuccessRatePrior: 87,
    funnel: [
      { stage: 'Application Received', count: 32, conversionRate: 100, averageDays: 0 },
      { stage: 'Background Check', count: 28, conversionRate: 88, averageDays: 3 },
      { stage: 'Credentialing Review', count: 24, conversionRate: 75, averageDays: 8 },
      { stage: 'Platform Onboarding', count: 18, conversionRate: 56, averageDays: 4 },
      { stage: 'First Session Scheduled', count: 12, conversionRate: 38, averageDays: 3 },
    ],
    activeOnboarding: 16,
    completedThisPeriod: 12,
    droppedThisPeriod: 4,
    bottlenecks: [
      { stage: 'Credentialing Review', averageDays: 8, dropRate: 14 },
      { stage: 'Background Check', averageDays: 3, dropRate: 9 },
    ],
    monthlyLaunches: [
      { date: '2025-10', value: 5 },
      { date: '2025-11', value: 7 },
      { date: '2025-12', value: 6 },
      { date: '2026-01', value: 9 },
      { date: '2026-02', value: 10 },
      { date: '2026-03', value: 12 },
    ],
  };

  const payerEVV: PayerEVVMetrics = {
    cleanClaimRate: 94,
    cleanClaimRatePrior: 91.5,
    denialRate: 6,
    denialRatePrior: 8.5,
    appealSuccessRate: 68,
    appealSuccessRatePrior: 61,
    averageDaysToPayment: 21,
    averageDaysToPaymentPrior: 28,
    evvComplianceRate: 94,
    evvMatchRate: 96,
    cleanCycles: 3,
    fiscalAgentConfidenceScore: 87,
    totalClaimsThisPeriod: 1847,
    totalDollarsBilled: 482300,
    totalDollarsCollected: 418700,
    topDenialReasons: [
      { reason: 'Authorization expired', count: 24, percentage: 35 },
      { reason: 'Medical necessity', count: 14, percentage: 20 },
      { reason: 'Wrong CPT code', count: 14, percentage: 20 },
      { reason: 'Timely filing', count: 10, percentage: 15 },
      { reason: 'Other', count: 7, percentage: 10 },
    ],
    payerBreakdown: [
      { payer: 'United Healthcare', claimCount: 612, cleanRate: 97, avgDays: 19 },
      { payer: 'AHCCCS (Medicaid)', claimCount: 534, cleanRate: 92, avgDays: 24 },
      { payer: 'Blue Cross AZ', claimCount: 389, cleanRate: 95, avgDays: 20 },
      { payer: 'Cigna', claimCount: 198, cleanRate: 96, avgDays: 18 },
      { payer: 'Aetna', claimCount: 114, cleanRate: 91, avgDays: 26 },
    ],
    monthlyTrend: [
      { date: '2025-10', value: 88 },
      { date: '2025-11', value: 89.5 },
      { date: '2025-12', value: 91 },
      { date: '2026-01', value: 91.5 },
      { date: '2026-02', value: 93 },
      { date: '2026-03', value: 94 },
    ],
  };

  const coreData = { familyRetention, telehealthLiquidity, providerLaunch, payerEVV };
  const overallHealth = calculateOverallHealth(coreData);
  const alerts = generateAlerts(coreData);

  return {
    dateRange: { start: '2026-03-01', end: '2026-03-31', label: 'March 2026' },
    ...coreData,
    overallHealth,
    alerts,
  };
}
