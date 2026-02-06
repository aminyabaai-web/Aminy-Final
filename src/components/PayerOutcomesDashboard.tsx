/**
 * Payer Outcomes Dashboard
 *
 * For insurance companies, MCOs, and fiscal intermediaries to view:
 * - Population health metrics
 * - ROI on autism support investment
 * - Claims avoidance projections
 * - Quality metrics for value-based contracts
 */

import React, { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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
}: PayerOutcomesDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | '1y'>('90d');

  const metrics = useMemo(() => ({
    ...DEFAULT_METRICS,
    ...providedMetrics,
  }), [providedMetrics]);

  const getOrgTypeLabel = () => {
    switch (organizationType) {
      case 'insurance': return 'Insurance Plan';
      case 'mco': return 'Managed Care Organization';
      case 'fiscal_intermediary': return 'Fiscal Intermediary';
      case 'employer': return 'Employer Plan';
      default: return 'Organization';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-teal-600" />
                <Badge variant="outline" className="text-xs">
                  {getOrgTypeLabel()}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {organizationName} Outcomes Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Population health metrics and ROI analysis
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                {(['30d', '90d', '1y'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedTimeframe === tf
                        ? 'bg-teal-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tf === '30d' ? '30 Days' : tf === '90d' ? '90 Days' : '1 Year'}
                  </button>
                ))}
              </div>
              <Button onClick={onExportReport}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial Impact</TabsTrigger>
            <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Return on Investment Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-400">Investment per member/month</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(metrics.avgCostPerMember / 12)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-400">ER visits avoided</span>
                    <span className="font-semibold text-green-600">
                      {metrics.erVisitsAvoided} × $1,200 avg = {formatCurrency(metrics.erVisitsAvoided * 1200)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-400">Crisis interventions avoided</span>
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
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
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      Total Annual Savings
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(metrics.projectedSavings)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
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
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Per Member Economics
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Annual cost</span>
                      <span className="font-medium">{formatCurrency(metrics.avgCostPerMember)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Annual savings</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(metrics.projectedSavings / metrics.activeUsers)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                      <span className="text-gray-700 dark:text-gray-300">Net benefit</span>
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
                  <h3 className="font-semibold text-gray-900 dark:text-white">Member Satisfaction</h3>
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Exceeds Target
                  </Badge>
                </div>
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-teal-600">{metrics.memberSatisfaction}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Based on quarterly CAHPS surveys
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Industry Average</span>
                    <span className="font-medium">72%</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500 dark:text-gray-400">Your Target</span>
                    <span className="font-medium">85%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Net Promoter Score</h3>
                  <Badge className="bg-blue-100 text-blue-700">Excellent</Badge>
                </div>
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-blue-600">+{metrics.nps}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    "Would you recommend Aminy?"
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Promoters: 72%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Passives: 23%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Detractors: 5%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Caregiver Burnout</h3>
                  <Badge className="bg-purple-100 text-purple-700">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Improving
                  </Badge>
                </div>
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-purple-600">
                    -{metrics.caregiverBurnoutReduction}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
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
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Goal Achievement Rate
                </h3>
                <ProgressMetric
                  label="IEP/Treatment Goals Met"
                  value={metrics.goalAchievementRate}
                  max={100}
                  color="teal"
                  showPercentage
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Families using Aminy achieve goals 23% faster than control group.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Routine Adherence
                </h3>
                <ProgressMetric
                  label="Daily Routine Completion"
                  value={metrics.routineAdherence}
                  max={100}
                  color="blue"
                  showPercentage
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Consistent routines improve behavior outcomes and reduce crisis events.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Documentation Compliance
                </h3>
                <ProgressMetric
                  label="Complete & Timely Documentation"
                  value={metrics.documentComplianceRate}
                  max={100}
                  color="green"
                  showPercentage
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Auto-generated logs and notes ensure compliance with waiver requirements.
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Utilization Tab */}
          <TabsContent value="utilization">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Platform Engagement
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active Users</span>
                      <span className="font-medium">
                        {formatNumber(metrics.activeUsers)} / {formatNumber(metrics.totalMembers)}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${metrics.engagementRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {metrics.engagementRate}% engagement rate
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <Activity className="w-5 h-5 text-teal-600 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {metrics.avgSessionsPerWeek}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Avg sessions/week
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        18 min
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Avg session length
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  HEDIS Quality Measures Impact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Follow-Up After ED Visit
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">94%</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      vs. 78% benchmark
                    </p>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Care Plan Documentation
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{metrics.documentComplianceRate}%</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      vs. 85% benchmark
                    </p>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Caregiver Assessment
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">88%</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
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
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600',
  };

  return (
    <Card className="p-4">
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
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      {subtext && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>
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
    teal: 'bg-teal-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    green: 'bg-green-500',
  };

  const percentage = (value / max) * 100;

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {showPercentage ? `${value}%` : value}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{category}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-green-600">{formatCurrency(total)}</p>
        <p className="text-xs text-gray-400">
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
        <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default PayerOutcomesDashboard;
