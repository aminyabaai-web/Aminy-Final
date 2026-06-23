/**
 * Payer Outcomes Dashboard
 *
 * For insurance companies, MCOs, and fiscal intermediaries to view:
 * - Population health metrics
 * - ROI on autism support investment
 * - Claims avoidance projections
 * - Quality metrics for value-based contracts
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Heart,
  Shield,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Target,
  Clock,
  AlertCircle,
  CheckCircle2,
  Building2,
  Activity,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DataProvenanceBadge } from './ui/DataProvenanceBadge';
import { LaunchStateBadge } from './ui/LaunchStateBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { createDataProvenance, getSurfaceLaunchConfig } from '../lib/product-truth';
import { getStateMarketCoverage, type SupportedProviderState } from '../lib/insurance/state-market-coverage';
import { listClaimReadyCases, summarizeClaimReadyQueue, summarizePayerOps, type ClaimReadyCase } from '../lib/claim-ready-queue';

interface PayerMetrics {
  // Population Overview
  totalMembers: number;
  activeUsers: number;
  engagementRate: number;
  avgSessionsPerWeek: number;

  // Financial Impact
  projectedSavings: number;
  claimsAvoided: number;
  erVisitsAvoided: number;
  crisisInterventionsAvoided: number;
  avgCostPerMember: number;
  costReduction: number;

  // Quality Metrics
  memberSatisfaction: number;
  nps: number;
  goalAchievementRate: number;
  routineAdherence: number;
  caregiverBurnoutReduction: number;

  // Utilization
  abaHoursOptimized: number;
  telehealthAdoption: number;
  documentComplianceRate: number;
}

interface PayerOutcomesDashboardProps {
  organizationName: string;
  organizationType: 'insurance' | 'mco' | 'fiscal_intermediary' | 'employer';
  metrics?: Partial<PayerMetrics>;
  dateRange?: { start: Date; end: Date };
  onExportReport?: () => void;
  state?: SupportedProviderState;
}

const DEFAULT_METRICS: PayerMetrics = {
  totalMembers: 2847,
  activeUsers: 2156,
  engagementRate: 75.7,
  avgSessionsPerWeek: 4.2,
  projectedSavings: 847500,
  claimsAvoided: 423,
  erVisitsAvoided: 89,
  crisisInterventionsAvoided: 156,
  avgCostPerMember: 297,
  costReduction: 23,
  memberSatisfaction: 92,
  nps: 67,
  goalAchievementRate: 78,
  routineAdherence: 82,
  caregiverBurnoutReduction: 34,
  abaHoursOptimized: 12450,
  telehealthAdoption: 68,
  documentComplianceRate: 96,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function PayerOutcomesDashboard({
  organizationName,
  organizationType,
  metrics: providedMetrics,
  dateRange,
  onExportReport,
  state = 'AZ',
}: PayerOutcomesDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | '1y'>('90d');
  const [claimQueue, setClaimQueue] = useState<ClaimReadyCase[]>([]);

  const metrics = useMemo(() => ({
    ...DEFAULT_METRICS,
    ...providedMetrics,
  }), [providedMetrics]);
  const launchConfig = getSurfaceLaunchConfig('payer-dashboard');
  const marketCoverage = useMemo(() => getStateMarketCoverage(state), [state]);
  const claimQueueSummary = useMemo(() => summarizeClaimReadyQueue(claimQueue), [claimQueue]);
  const payerOpsSummary = useMemo(() => summarizePayerOps(claimQueue, state), [claimQueue, state]);
  const visibleClaimQueue = useMemo(() => claimQueue.slice(0, 6), [claimQueue]);
  const marketLabel = marketCoverage?.label || state;
  const metricsProvenance = useMemo(() => (
    providedMetrics
      ? createDataProvenance('live', 'Arizona payer pilot metrics', {
          isVerified: true,
          lastUpdatedAt: new Date().toISOString(),
        })
      : createDataProvenance('sample', 'Pilot sample metrics', {
          isVerified: false,
        })
  ), [providedMetrics]);

  useEffect(() => {
    let cancelled = false;

    async function loadClaimQueue() {
      const cases = await listClaimReadyCases(state);
      if (!cancelled) {
        setClaimQueue(cases);
      }
    }

    if (claimQueue.length === 0) {
      void loadClaimQueue();
    }

    return () => {
      cancelled = true;
    };
  }, [state, claimQueue.length]);

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    if (nextTab === 'claims') {
      void listClaimReadyCases(state).then(setClaimQueue).catch((error) => {
        console.warn('[PayerOutcomesDashboard] Failed to refresh claim queue on tab change:', error);
      });
    }
  };

  const getOrgTypeLabel = () => {
    switch (organizationType) {
      case 'insurance': return 'Insurance Plan';
      case 'mco': return 'Managed Care Organization';
      case 'fiscal_intermediary': return 'Fiscal Intermediary';
      case 'employer': return 'Employer Plan';
      default: return 'Organization';
    }
  };

  const queueTone = (status: ClaimReadyCase['queueStatus']) => {
    switch (status) {
      case 'ready_for_biller':
      case 'approved_for_submission':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
          panel: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200',
          helper: 'Ready for biller review',
        };
      case 'submitted':
      case 'accepted':
      case 'paid':
        return {
          badge: 'bg-sky-100 text-sky-800 border border-sky-200',
          panel: 'bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200',
          helper: 'Moving through the live submission lane',
        };
      case 'denied':
        return {
          badge: 'bg-rose-100 text-rose-800 border border-rose-200',
          panel: 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200',
          helper: 'Needs denial follow-up before payment',
        };
      default:
        return {
          badge: 'bg-amber-100 text-amber-800 border border-amber-200',
          panel: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200',
          helper: 'Blocked until the missing requirement is resolved',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),transparent_34%),linear-gradient(180deg,#f7fffd_0%,#f4f7f8_100%)]">
      {/* Header */}
      <div className="border-b border-[#E8E4DF]/80 bg-white/88 backdrop-blur supports-[backdrop-filter]:bg-white/78">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Building2 className="w-5 h-5 text-[#6B9080]" />
                <Badge variant="outline" className="text-xs">
                  {getOrgTypeLabel()}
                </Badge>
                <LaunchStateBadge state={launchConfig.state} label={launchConfig.badgeLabel} />
                <DataProvenanceBadge provenance={metricsProvenance} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1B2733] sm:text-3xl">
                {organizationName} Coverage and Claims
              </h1>
              <h2 className="sr-only">Payer operations overview</h2>
              <h3 className="sr-only">Claims, metrics, and supported plans</h3>
              <p className="mt-1 text-sm text-[#5A6B7A]">
                Coverage routing, claim-ready operations, and payer trust signals for the {marketLabel} supported lane.
              </p>
              {!providedMetrics ? (
                <p className="mt-2 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  This dashboard is using clearly labeled pilot sample metrics until live payer and claims data is connected for the {marketLabel} lane.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex overflow-hidden rounded-2xl border border-[#E8E4DF] bg-white shadow-sm">
                {(['30d', '90d', '1y'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedTimeframe === tf
                        ? 'bg-primary text-white'
                        : 'bg-white text-[#5A6B7A] hover:bg-[#6B9080]/10'
                    }`}
                  >
                    {tf === '30d' ? '30 Days' : tf === '90d' ? '90 Days' : '1 Year'}
                  </button>
                ))}
              </div>
              <Button onClick={onExportReport} className="rounded-2xl bg-primary text-white hover:bg-[#6B9080]">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 h-auto flex-wrap justify-start gap-2 rounded-3xl border border-[#E8E4DF] bg-white/92 p-2 shadow-sm">
            <TabsTrigger className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white" value="financial">Financial Impact</TabsTrigger>
            <TabsTrigger className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white" value="quality">Quality Metrics</TabsTrigger>
            <TabsTrigger className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white" value="utilization">Utilization</TabsTrigger>
            <TabsTrigger className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white" value="claims">Claims Ops</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                label="Projected Annual Savings"
                value={formatCurrency(metrics.projectedSavings)}
                change={12}
                positive={true}
                icon={DollarSign}
                color="green"
              />
              <MetricCard
                label="Active Members"
                value={formatNumber(metrics.activeUsers)}
                subtext={`of ${formatNumber(metrics.totalMembers)} enrolled`}
                change={8}
                positive={true}
                icon={Users}
                color="blue"
              />
              <MetricCard
                label="Member Satisfaction"
                value={`${metrics.memberSatisfaction}%`}
                change={5}
                positive={true}
                icon={Heart}
                color="pink"
              />
              <MetricCard
                label="Claims Avoided"
                value={formatNumber(metrics.claimsAvoided)}
                change={18}
                positive={true}
                icon={Shield}
                color="purple"
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ROI Summary */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-4">
                  Return on Investment Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-[#E8E4DF] dark:border-slate-700">
                    <span className="text-[#5A6B7A] dark:text-[#8A9BA8]">Investment per member/month</span>
                    <span className="font-semibold text-[#1B2733] dark:text-white">
                      {formatCurrency(metrics.avgCostPerMember / 12)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#E8E4DF] dark:border-slate-700">
                    <span className="text-[#5A6B7A] dark:text-[#8A9BA8]">ER visits avoided</span>
                    <span className="font-semibold text-green-600">
                      {metrics.erVisitsAvoided} × $1,200 avg = {formatCurrency(metrics.erVisitsAvoided * 1200)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#E8E4DF] dark:border-slate-700">
                    <span className="text-[#5A6B7A] dark:text-[#8A9BA8]">Crisis interventions avoided</span>
                    <span className="font-semibold text-green-600">
                      {metrics.crisisInterventionsAvoided} × $3,500 avg = {formatCurrency(metrics.crisisInterventionsAvoided * 3500)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 -mx-4">
                    <span className="font-medium text-green-800 dark:text-green-300">Net Savings (Annual)</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(metrics.projectedSavings)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Engagement Overview */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-4">
                  Member Engagement
                </h3>
                <div className="space-y-6">
                  <ProgressMetric
                    label="Engagement Rate"
                    value={metrics.engagementRate}
                    max={100}
                    color="teal"
                  />
                  <ProgressMetric
                    label="Goal Achievement"
                    value={metrics.goalAchievementRate}
                    max={100}
                    color="blue"
                  />
                  <ProgressMetric
                    label="Routine Adherence"
                    value={metrics.routineAdherence}
                    max={100}
                    color="purple"
                  />
                  <ProgressMetric
                    label="Telehealth Adoption"
                    value={metrics.telehealthAdoption}
                    max={100}
                    color="pink"
                  />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Impact Tab */}
          <TabsContent value="financial">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cost Breakdown */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-6">
                  Cost Savings Breakdown
                </h3>
                <div className="space-y-4">
                  <SavingsRow
                    category="ER Visit Avoidance"
                    count={metrics.erVisitsAvoided}
                    avgCost={1200}
                    description="Parents use Aminy for crisis prevention instead of ER"
                  />
                  <SavingsRow
                    category="Crisis Intervention Avoidance"
                    count={metrics.crisisInterventionsAvoided}
                    avgCost={3500}
                    description="24/7 AI support prevents escalation"
                  />
                  <SavingsRow
                    category="Reduced Care Coordinator Calls"
                    count={Math.round(metrics.activeUsers * 0.4 * 12)}
                    avgCost={25}
                    description="40% reduction in support calls"
                  />
                  <SavingsRow
                    category="Optimized ABA Hours"
                    count={metrics.abaHoursOptimized}
                    avgCost={15}
                    description="Better skill generalization = fewer hours needed"
                  />
                </div>
                <div className="mt-6 pt-6 border-t border-[#E8E4DF] dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-[#1B2733] dark:text-white">
                      Total Annual Savings
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(metrics.projectedSavings)}
                    </span>
                  </div>
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-2">
                    ROI: {Math.round((metrics.projectedSavings / (metrics.avgCostPerMember * metrics.activeUsers)) * 100)}% return on investment
                  </p>
                </div>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                      <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">
                      Cost Reduction
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                    {metrics.costReduction}%
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    vs. non-Aminy members
                  </p>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium text-[#1B2733] dark:text-white mb-3">
                    Per Member Economics
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#5A6B7A] dark:text-[#8A9BA8]">Annual cost</span>
                      <span className="font-medium">{formatCurrency(metrics.avgCostPerMember)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5A6B7A] dark:text-[#8A9BA8]">Annual savings</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(metrics.projectedSavings / metrics.activeUsers)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E8E4DF] dark:border-slate-700">
                      <span className="text-[#3A4A57] dark:text-gray-300">Net benefit</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency((metrics.projectedSavings / metrics.activeUsers) - metrics.avgCostPerMember)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Quality Metrics Tab */}
          <TabsContent value="quality">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#1B2733] dark:text-white">Member Satisfaction</h3>
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Exceeds Target
                  </Badge>
                </div>
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-[#6B9080]">{metrics.memberSatisfaction}%</p>
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-2">
                    {providedMetrics ? 'Based on quarterly CAHPS surveys' : 'Pilot sample metric — not yet sourced from CAHPS surveys'}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-[#E8E4DF] dark:border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5A6B7A] dark:text-[#8A9BA8]">Industry Average</span>
                    <span className="font-medium">72%</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-[#5A6B7A] dark:text-[#8A9BA8]">Your Target</span>
                    <span className="font-medium">85%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#1B2733] dark:text-white">Net Promoter Score</h3>
                  <Badge className="bg-blue-100 text-blue-700">Excellent</Badge>
                </div>
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-blue-600">+{metrics.nps}</p>
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-2">
                    "Would you recommend Aminy?"
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Promoters: 72%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Passives: 23%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Detractors: 5%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#1B2733] dark:text-white">Caregiver Burnout</h3>
                  <Badge className="bg-purple-100 text-purple-700">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Improving
                  </Badge>
                </div>
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-purple-600">
                    -{metrics.caregiverBurnoutReduction}%
                  </p>
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-2">
                    Reduction in Zarit Burden scores
                  </p>
                </div>
                <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Lower caregiver burnout correlates with reduced emergency utilization and better child outcomes.
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">
                  Goal Achievement Rate
                </h3>
                <ProgressMetric
                  label="IEP/Treatment Goals Met"
                  value={metrics.goalAchievementRate}
                  max={100}
                  color="teal"
                  showPercentage
                />
                <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-4">
                  Tracks the share of documented IEP and treatment goals met across the supported lane.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">
                  Routine Adherence
                </h3>
                <ProgressMetric
                  label="Daily Routine Completion"
                  value={metrics.routineAdherence}
                  max={100}
                  color="blue"
                  showPercentage
                />
                <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-4">
                  Consistent routines improve behavior outcomes and reduce crisis events.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">
                  Documentation Compliance
                </h3>
                <ProgressMetric
                  label="Complete & Timely Documentation"
                  value={metrics.documentComplianceRate}
                  max={100}
                  color="green"
                  showPercentage
                />
                <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-4">
                  Auto-generated logs and notes ensure compliance with waiver requirements.
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Claims Ops Tab */}
          <TabsContent value="claims">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="p-6 xl:col-span-2">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Claim-Ready Queue</h3>
                    <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-1">
                      Aminy assembles validated visit packets for biller review before submission. The queue is scoped to the {marketLabel} supported payer matrix and is not a fake auto-submit surface.
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Showing the 6 most recent cases so the lane stays reviewable
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E8E4DF] dark:border-slate-700 px-4 py-3 min-w-[220px]">
                    <p className="text-xs uppercase tracking-wide text-[#5A6B7A] dark:text-[#8A9BA8]">Queue Health</p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[#5A6B7A] dark:text-[#8A9BA8]">Ready</p>
                        <p className="text-xl font-semibold text-emerald-600">{claimQueueSummary.readyForBiller}</p>
                      </div>
                      <div>
                        <p className="text-[#5A6B7A] dark:text-[#8A9BA8]">Blocked</p>
                        <p className="text-xl font-semibold text-amber-600">{claimQueueSummary.blocked}</p>
                      </div>
                      <div>
                        <p className="text-[#5A6B7A] dark:text-[#8A9BA8]">Submitted</p>
                        <p className="text-xl font-semibold text-blue-600">{claimQueueSummary.submitted}</p>
                      </div>
                      <div>
                        <p className="text-[#5A6B7A] dark:text-[#8A9BA8]">Denied</p>
                        <p className="text-xl font-semibold text-rose-600">{claimQueueSummary.denied}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {visibleClaimQueue.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-[#FAF7F2]/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
                      <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-[#3A4A57] dark:text-slate-200">
                        No claim-ready cases for the {marketLabel} lane yet
                      </p>
                      <p className="mt-1 text-sm text-[#5A6B7A] dark:text-slate-400">
                        Validated visit packets will appear here once they are assembled for biller review.
                      </p>
                    </div>
                  ) : null}
                  {visibleClaimQueue.map((item) => {
                    const tone = queueTone(item.queueStatus);

                    return (
                    <div key={item.id} className="rounded-[28px] border border-[#E8E4DF]/85 bg-white/96 p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="font-semibold text-[#1B2733] dark:text-white">{item.patientName}</p>
                            <Badge variant="outline" className="border-slate-300/80 bg-white/90 text-[#5A6B7A]">
                              {item.payerName}
                            </Badge>
                            <Badge className={tone.badge}>
                              {item.queueStatus.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                            {item.providerName} • {item.visitType} • {item.serviceDate}
                          </p>
                          <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-1">
                            Route: {item.route.replace(/_/g, ' ')} • Submission mode: {item.submissionMode.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-2 text-sm font-medium text-[#3A4A57] dark:text-slate-200">
                            {tone.helper}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[#E8E4DF] bg-[#FAF7F2]/80 px-4 py-3 text-right dark:border-slate-700 dark:bg-slate-800/80">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Visit amount</p>
                          <p className="mt-1 text-lg font-semibold text-[#1B2733] dark:text-white">{formatCurrency(item.amountCents / 100)}</p>
                        </div>
                      </div>
                      {item.issues.length > 0 ? (
                        <div className={`mt-4 rounded-2xl p-4 ${tone.panel}`}>
                          <p className="mb-2 text-xs uppercase tracking-wide text-current/80">Blocking issues</p>
                          <ul className="space-y-1 text-sm text-current">
                            {item.issues.map((issue) => (
                              <li key={issue} className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className={`mt-4 rounded-2xl p-4 text-sm ${tone.panel}`}>
                          This case is ready for biller review and submission through the configured {item.submissionMode.replace(/_/g, ' ')} lane.
                        </div>
                      )}
                    </div>
                  )})}
                  {claimQueue.length > visibleClaimQueue.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-[#FAF7F2]/80 p-4 text-sm text-[#5A6B7A] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                      {claimQueue.length - visibleClaimQueue.length} additional cases are available in the operator queue. This summary stays intentionally trimmed so billers can scan the lane quickly on desktop and mobile.
                    </div>
                  ) : null}
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Payer Ops Pressure</h3>
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-1">
                    This is the real biller pressure summary for the supported-state lane: auth blockers, denials, secondaries, and any payer cases that fall outside the launch matrix.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Auth blockers</p>
                      <p className="mt-1 text-xl font-semibold text-amber-800">{payerOpsSummary.authBlockedCases}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-rose-700">Denials open</p>
                      <p className="mt-1 text-xl font-semibold text-rose-800">{payerOpsSummary.deniedCases}</p>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Secondary plans</p>
                      <p className="mt-1 text-xl font-semibold text-sky-800">{payerOpsSummary.secondaryPolicyCases}</p>
                    </div>
                    <div className="rounded-2xl border border-[#E8E4DF] bg-[#FAF7F2] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#5A6B7A]">Out of matrix</p>
                      <p className="mt-1 text-xl font-semibold text-[#1B2733]">{payerOpsSummary.unsupportedPayerCases}</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {payerOpsSummary.payerLanes.slice(0, 4).map((lane) => (
                      <div key={lane.payerId} className="rounded-2xl border border-[#E8E4DF]/85 bg-white/96 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-[#1B2733] dark:text-white">{lane.payerName}</p>
                              <Badge className={lane.supported ? 'bg-emerald-100 text-emerald-700' : 'bg-[#E8E4DF] text-[#3A4A57]'}>
                                {lane.supported ? lane.launchState.replace(/_/g, ' ') : 'manual review'}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-[#5A6B7A]">
                              {lane.totalCases} cases • {lane.blockedCases} blocked • {lane.deniedCases} denied • submission via {lane.submissionModes.join(', ').replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="text-right text-xs text-[#5A6B7A]">
                            <p>{lane.authBlockedCases} auth blocked</p>
                            <p>{lane.secondaryPolicyCases} with secondary</p>
                          </div>
                        </div>
                        {lane.operatorNotes.length > 0 ? (
                          <ul className="mt-3 space-y-1 text-xs text-[#5A6B7A] dark:text-slate-300">
                            {lane.operatorNotes.map((note) => (
                              <li key={note} className="flex items-start gap-2">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">Supported Payer Matrix</h3>
                <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-1">
                  Coverage Coach and claims ops should support the payer products covering the majority of addressable demand in each live state.
                </p>
                <div className="mt-6 space-y-3">
                  {(marketCoverage?.payerProducts || []).map((payer) => (
                    <div key={payer.id} className="rounded-xl border border-[#E8E4DF] dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#1B2733] dark:text-white">{payer.displayName}</p>
                          <p className="text-xs text-[#5A6B7A] dark:text-[#8A9BA8]">
                            {payer.payerType.replace(/_/g, ' ')} • {payer.submissionPath.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <Badge className={marketCoverage?.launchState === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                          {marketCoverage?.launchState.replace(/_/g, ' ') || 'limited launch'}
                        </Badge>
                      </div>
                      {marketCoverage?.notes?.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-[#5A6B7A] dark:text-gray-300">
                          {marketCoverage.notes.slice(0, 2).map((note: string) => (
                            <li key={note}>• {note}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Utilization Tab */}
          <TabsContent value="utilization">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-4">
                  Platform Engagement
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Active Users</span>
                      <span className="font-medium">
                        {formatNumber(metrics.activeUsers)} / {formatNumber(metrics.totalMembers)}
                      </span>
                    </div>
                    <div className="h-3 bg-[#F0EDE8] dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${metrics.engagementRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#5A6B7A] dark:text-[#8A9BA8] mt-1">
                      {metrics.engagementRate}% engagement rate
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#FAF7F2] dark:bg-slate-800 rounded-lg">
                      <Activity className="w-5 h-5 text-[#6B9080] mb-2" />
                      <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                        {metrics.avgSessionsPerWeek}
                      </p>
                      <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                        Avg sessions/week
                      </p>
                    </div>
                    <div className="p-4 bg-[#FAF7F2] dark:bg-slate-800 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                        18 min
                      </p>
                      <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                        Avg session length
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-4">
                  Feature Utilization
                </h3>
                <div className="space-y-4">
                  <UtilizationRow feature="AI Chat Support" percentage={89} />
                  <UtilizationRow feature="Care Plan Management" percentage={72} />
                  <UtilizationRow feature="Routine Tracking" percentage={68} />
                  <UtilizationRow feature="Telehealth Booking" percentage={metrics.telehealthAdoption} />
                  <UtilizationRow feature="Community Features" percentage={45} />
                  <UtilizationRow feature="Document Vault" percentage={38} />
                </div>
              </Card>

              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mb-4">
                  HEDIS Quality Measures Impact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-[#E8E4DF] dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-[#1B2733] dark:text-white">
                        Follow-Up After ED Visit
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">94%</p>
                    <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                      vs. 78% benchmark
                    </p>
                  </div>
                  <div className="p-4 border border-[#E8E4DF] dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-[#1B2733] dark:text-white">
                        Care Plan Documentation
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{metrics.documentComplianceRate}%</p>
                    <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                      vs. 85% benchmark
                    </p>
                  </div>
                  <div className="p-4 border border-[#E8E4DF] dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-[#1B2733] dark:text-white">
                        Caregiver Assessment
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">88%</p>
                    <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                      vs. 65% benchmark
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({
  label,
  value,
  subtext,
  change,
  positive,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  change?: number;
  positive?: boolean;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'pink' | 'purple' | 'teal';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-[#EEF4F8] text-blue-600',
    pink: 'bg-pink-50 text-pink-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-[#6B9080]/10 text-[#6B9080]',
  };

  return (
    <Card className="rounded-3xl border border-white/80 bg-white/92 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            positive ? 'text-green-600' : 'text-red-600'
          }`}>
            {positive ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {change}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[#1B2733]">{value}</p>
      <p className="text-sm text-[#5A6B7A]">{label}</p>
      {subtext && (
        <p className="mt-1 text-xs text-slate-400">{subtext}</p>
      )}
    </Card>
  );
}

function ProgressMetric({
  label,
  value,
  max,
  color,
  showPercentage,
}: {
  label: string;
  value: number;
  max: number;
  color: 'teal' | 'blue' | 'purple' | 'pink' | 'green';
  showPercentage?: boolean;
}) {
  const colorClasses = {
    teal: 'bg-primary',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    green: 'bg-green-500',
  };

  const percentage = (value / max) * 100;

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm text-[#5A6B7A]">{label}</span>
        <span className="text-sm font-medium text-[#1B2733]">
          {showPercentage ? `${value}%` : value}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#F0EDE8] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${colorClasses[color]} rounded-full`}
        />
      </div>
    </div>
  );
}

function SavingsRow({
  category,
  count,
  avgCost,
  description,
}: {
  category: string;
  count: number;
  avgCost: number;
  description: string;
}) {
  const total = count * avgCost;

  return (
    <div className="flex items-center justify-between border-b border-[#E8E4DF] py-3">
      <div>
        <p className="font-medium text-[#1B2733]">{category}</p>
        <p className="text-sm text-[#5A6B7A]">{description}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-green-600">{formatCurrency(total)}</p>
        <p className="text-xs text-[#8A9BA8]">
          {formatNumber(count)} × {formatCurrency(avgCost)}
        </p>
      </div>
    </div>
  );
}

function UtilizationRow({ feature, percentage }: { feature: string; percentage: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-[#5A6B7A]">{feature}</span>
        <span className="text-sm font-medium text-[#1B2733]">{percentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#F0EDE8] overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default PayerOutcomesDashboard;
