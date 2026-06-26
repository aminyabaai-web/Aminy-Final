/**
 * Impact Metrics Dashboard
 * Aligned with IRIS+ catalog for impact investors (Acumen-style)
 *
 * Features:
 * - Theory of Change visualization
 * - IRIS+ aligned metrics
 * - Beneficiary tracking
 * - Outcome measurement
 * - Impact reports export
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DataProvenanceBadge } from './ui/DataProvenanceBadge';
import { LaunchStateBadge } from './ui/LaunchStateBadge';
import {
  Users,
  Heart,
  Brain,
  TrendingUp,
  Target,
  Clock,
  Download,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Activity,
  Calendar,
  MapPin,
  DollarSign,
  GraduationCap,
  Home,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';
import { createDataProvenance, getSurfaceLaunchConfig } from '../lib/product-truth';

// IRIS+ Metric Categories based on GIIN taxonomy
export interface ImpactMetrics {
  // PI7127 - Individuals Served
  beneficiaries: {
    total: number;
    children: number;
    caregivers: number;
    newThisMonth: number;
    retentionRate: number;
  };

  // PI8330 - Client Outcomes
  outcomes: {
    behaviorImprovements: number; // % showing improvement
    stressReduction: number; // % caregivers reporting reduced stress
    sleepImprovement: number; // % reporting better sleep
    schoolReadiness: number; // % meeting developmental milestones
    familyQualityOfLife: number; // Average QoL score (1-10)
  };

  // OI1120 - Operational Indicators
  operations: {
    sessionsDelivered: number;
    aiInteractions: number;
    averageSessionLength: number; // minutes
    contentEngagement: number; // % completing daily activities
    appRetentionDay7: number; // % still using at day 7
    appRetentionDay30: number; // % still using at day 30
  };

  // PI9468 - Access & Equity
  equity: {
    lowIncomeServed: number; // % on Medicaid/financial aid
    ruralServed: number; // % in rural areas
    firstTimeParentsServed: number; // % first-time parents
    diversityIndex: number; // 0-1 score
    languagesSupported: number;
  };

  // Financial Sustainability
  financial: {
    costPerBeneficiary: number;
    revenuePerBeneficiary: number;
    monthlyBurnRate: number;
    runwayMonths: number;
    ltv: number;
    cac: number;
  };

  // Trend data
  trends: {
    beneficiaryGrowth: 'up' | 'down' | 'stable';
    outcomeImprovement: 'up' | 'down' | 'stable';
    retentionTrend: 'up' | 'down' | 'stable';
  };

  lastUpdated: string;
}

// Theory of Change model
const THEORY_OF_CHANGE = {
  inputs: [
    { id: 'tech', label: 'AI-powered platform', icon: Brain },
    { id: 'content', label: 'Evidence-based ABA content', icon: GraduationCap },
    { id: 'community', label: 'Parent support community', icon: Users },
    { id: 'data', label: 'Progress tracking tools', icon: BarChart3 },
  ],
  activities: [
    { id: 'intake', label: 'Personalized intake & care plans' },
    { id: 'daily', label: 'Daily activity recommendations' },
    { id: 'coaching', label: 'AI coaching & support' },
    { id: 'tracking', label: 'Behavior tracking & insights' },
    { id: 'connect', label: 'Community connection' },
  ],
  outputs: [
    { id: 'users', label: 'Families enrolled', metric: 'beneficiaries.total' },
    { id: 'sessions', label: 'Sessions completed', metric: 'operations.sessionsDelivered' },
    { id: 'engagement', label: 'Daily engagement rate', metric: 'operations.contentEngagement' },
  ],
  outcomes: [
    { id: 'behavior', label: 'Behavior improvement', metric: 'outcomes.behaviorImprovements', target: 70 },
    { id: 'stress', label: 'Caregiver stress reduction', metric: 'outcomes.stressReduction', target: 60 },
    { id: 'qol', label: 'Family quality of life', metric: 'outcomes.familyQualityOfLife', target: 7 },
  ],
  impact: [
    { id: 'children', label: 'Children developing to potential' },
    { id: 'families', label: 'Families thriving' },
    { id: 'equity', label: 'Reduced disparities in care access' },
  ],
};

// IRIS+ metric mapping
const IRIS_METRICS = [
  { code: 'PI7127', name: 'Client Individuals: Total', category: 'Beneficiaries' },
  { code: 'PI8330', name: 'Client Outcomes Achieved', category: 'Outcomes' },
  { code: 'OI1120', name: 'Units/Volume of Products/Services Sold', category: 'Operations' },
  { code: 'PI9468', name: 'Underserved Client Demographics', category: 'Equity' },
  { code: 'OI4112', name: 'Operating Costs', category: 'Financial' },
];

interface ImpactMetricsDashboardProps {
  organizationName?: string;
  reportingPeriod?: string;
}

export function ImpactMetricsDashboard({
  organizationName = 'Aminy',
  reportingPeriod = 'Q1 2025',
}: ImpactMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'toc' | 'iris'>('dashboard');
  const sampleMetricsProvenance = createDataProvenance('sample', 'Internal sample impact metrics', {
    isVerified: false,
    lastUpdatedAt: new Date().toISOString(),
  });
  const launchConfig = getSurfaceLaunchConfig('analytics');

  // Fetch impact metrics
  useEffect(() => {
    const fetchImpactMetrics = async () => {
      setLoading(true);
      try {
        // In production, this would fetch from Supabase
        // For now, using realistic mock data based on pilot targets
        const mockMetrics: ImpactMetrics = {
          beneficiaries: {
            total: 847,
            children: 523,
            caregivers: 689,
            newThisMonth: 127,
            retentionRate: 78.5,
          },
          outcomes: {
            behaviorImprovements: 72,
            stressReduction: 65,
            sleepImprovement: 58,
            schoolReadiness: 61,
            familyQualityOfLife: 7.2,
          },
          operations: {
            sessionsDelivered: 12847,
            aiInteractions: 45239,
            averageSessionLength: 8.5,
            contentEngagement: 67,
            appRetentionDay7: 72,
            appRetentionDay30: 45,
          },
          equity: {
            lowIncomeServed: 42,
            ruralServed: 28,
            firstTimeParentsServed: 35,
            diversityIndex: 0.72,
            languagesSupported: 2,
          },
          financial: {
            costPerBeneficiary: 12.50,
            revenuePerBeneficiary: 18.75,
            monthlyBurnRate: 45000,
            runwayMonths: 14,
            ltv: 225,
            cac: 45,
          },
          trends: {
            beneficiaryGrowth: 'up',
            outcomeImprovement: 'up',
            retentionTrend: 'stable',
          },
          lastUpdated: new Date().toISOString(),
        };

        setMetrics(mockMetrics);
      } catch (error) {
        console.error('Error fetching impact metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImpactMetrics();
  }, []);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-[#8A9BA8]" />;
    }
  };

  const exportImpactReport = () => {
    if (!metrics) return;

    const report = {
      organization: organizationName,
      reportingPeriod,
      generatedAt: new Date().toISOString(),
      irisMetrics: IRIS_METRICS,
      metrics,
      theoryOfChange: THEORY_OF_CHANGE,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${organizationName.toLowerCase()}-impact-report-${reportingPeriod.replace(' ', '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !metrics) {
    return (
      <div className="p-6 space-y-3 sm:space-y-4 animate-pulse">
        <div className="h-8 bg-[#E8E4DF] dark:bg-slate-700 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-[#E8E4DF] dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3 sm:space-y-4 sm:space-y-6 bg-[#F6FBFB] dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#132F43] dark:text-white flex items-center gap-2">
            <Target className="w-7 h-7 text-[#6B9080]" />
            Impact Dashboard
          </h1>
          <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
            IRIS+ aligned metrics for {reportingPeriod}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LaunchStateBadge state={launchConfig.state} label={launchConfig.badgeLabel} />
            <DataProvenanceBadge provenance={sampleMetricsProvenance} />
          </div>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">These impact metrics are internal sample values until Aminy has live reporting and verified benchmarks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportImpactReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Badge variant="outline" className="text-sm">
            <Clock className="w-3 h-3 mr-1" />
            Updated {new Date(metrics.lastUpdated).toLocaleDateString()}
          </Badge>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 border-b border-[#E8E4DF] dark:border-slate-700">
        {[
          { id: 'dashboard', label: 'Overview' },
          { id: 'toc', label: 'Theory of Change' },
          { id: 'iris', label: 'IRIS+ Mapping' },
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id as typeof activeView)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeView === view.id
                ? 'border-[#6B9080] text-[#6B9080] dark:text-primary'
                : 'border-transparent text-[#5A6B7A] dark:text-[#8A9BA8] hover:text-[#132F43] dark:hover:text-white'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {activeView === 'dashboard' && (
        <>
          {/* Key Impact Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 border-[#C8DDE8] dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  {getTrendIcon(metrics.trends.beneficiaryGrowth)}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {metrics.beneficiaries.total.toLocaleString()}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-500">Families Served</div>
                <div className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                  +{metrics.beneficiaries.newThisMonth} this month
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 border-green-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  {getTrendIcon(metrics.trends.outcomeImprovement)}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">
                  {metrics.outcomes.behaviorImprovements}%
                </div>
                <div className="text-sm text-green-600 dark:text-green-500">Behavior Improvement</div>
                <div className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                  Target: 70%
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-slate-800 dark:to-slate-800 border-purple-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  {getTrendIcon(metrics.trends.retentionTrend)}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {metrics.outcomes.stressReduction}%
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-500">Stress Reduction</div>
                <div className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                  Caregiver reported
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 border-amber-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {metrics.outcomes.familyQualityOfLife}/10
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-500">Quality of Life</div>
                <div className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                  Family average score
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Detailed Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
            {/* Beneficiary Demographics */}
            <Card className="p-5 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#6B9080]" />
                Beneficiary Breakdown
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Children Served</span>
                  <span className="font-semibold dark:text-white">{metrics.beneficiaries.children}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Caregivers Engaged</span>
                  <span className="font-semibold dark:text-white">{metrics.beneficiaries.caregivers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">30-Day Retention</span>
                  <span className="font-semibold dark:text-white">{metrics.beneficiaries.retentionRate}%</span>
                </div>
                <hr className="dark:border-slate-700" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Low-Income Families</span>
                  <Badge variant="outline">{metrics.equity.lowIncomeServed}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Rural Areas</span>
                  <Badge variant="outline">{metrics.equity.ruralServed}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">First-Time Parents</span>
                  <Badge variant="outline">{metrics.equity.firstTimeParentsServed}%</Badge>
                </div>
              </div>
            </Card>

            {/* Outcomes */}
            <Card className="p-5 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#6B9080]" />
                Outcome Metrics
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {[
                  { label: 'Behavior Improvement', value: metrics.outcomes.behaviorImprovements, target: 70, color: 'bg-green-500' },
                  { label: 'Stress Reduction', value: metrics.outcomes.stressReduction, target: 60, color: 'bg-purple-500' },
                  { label: 'Sleep Improvement', value: metrics.outcomes.sleepImprovement, target: 50, color: 'bg-blue-500' },
                  { label: 'School Readiness', value: metrics.outcomes.schoolReadiness, target: 65, color: 'bg-amber-500' },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#5A6B7A] dark:text-[#8A9BA8]">{metric.label}</span>
                      <span className="font-medium dark:text-white">{metric.value}%</span>
                    </div>
                    <div className="relative h-2 bg-[#E8E4DF] dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full ${metric.color} rounded-full transition-all duration-500`}
                        style={{ width: `${metric.value}%` }}
                      />
                      {/* Target marker */}
                      <div
                        className="absolute top-0 w-0.5 h-full bg-gray-800 dark:bg-white"
                        style={{ left: `${metric.target}%` }}
                        title={`Target: ${metric.target}%`}
                      />
                    </div>
                    <div className="text-sm text-[#8A9BA8] mt-0.5">
                      Target: {metric.target}%
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Operations */}
            <Card className="p-5 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#6B9080]" />
                Operational Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center p-3 bg-[#F6FBFB] dark:bg-slate-900 rounded-lg">
                  <div className="text-xl font-bold text-[#132F43] dark:text-white">
                    {metrics.operations.sessionsDelivered.toLocaleString()}
                  </div>
                  <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Sessions Delivered</div>
                </div>
                <div className="text-center p-3 bg-[#F6FBFB] dark:bg-slate-900 rounded-lg">
                  <div className="text-xl font-bold text-[#132F43] dark:text-white">
                    {metrics.operations.aiInteractions.toLocaleString()}
                  </div>
                  <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">AI Interactions</div>
                </div>
                <div className="text-center p-3 bg-[#F6FBFB] dark:bg-slate-900 rounded-lg">
                  <div className="text-xl font-bold text-[#132F43] dark:text-white">
                    {metrics.operations.averageSessionLength}min
                  </div>
                  <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Avg Session</div>
                </div>
                <div className="text-center p-3 bg-[#F6FBFB] dark:bg-slate-900 rounded-lg">
                  <div className="text-xl font-bold text-[#132F43] dark:text-white">
                    {metrics.operations.contentEngagement}%
                  </div>
                  <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Engagement</div>
                </div>
              </div>
            </Card>

            {/* Financial Sustainability */}
            <Card className="p-5 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#6B9080]" />
                Unit Economics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Cost per Beneficiary</span>
                  <span className="font-semibold dark:text-white">${metrics.financial.costPerBeneficiary}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Revenue per Beneficiary</span>
                  <span className="font-semibold dark:text-white">${metrics.financial.revenuePerBeneficiary}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">LTV:CAC Ratio</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {(metrics.financial.ltv / metrics.financial.cac).toFixed(1)}x
                  </span>
                </div>
                <hr className="dark:border-slate-700" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Monthly Burn</span>
                  <span className="font-semibold dark:text-white">${(metrics.financial.monthlyBurnRate / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Runway</span>
                  <Badge variant={metrics.financial.runwayMonths > 12 ? 'default' : 'destructive'}>
                    {metrics.financial.runwayMonths} months
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {activeView === 'toc' && (
        <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
          <h3 className="font-semibold text-[#132F43] dark:text-white mb-4 sm:mb-6 text-lg">
            Theory of Change
          </h3>
          <div className="overflow-x-auto">
            <div className="flex gap-3 sm:gap-4 min-w-[800px]">
              {/* Inputs */}
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#5A6B7A] dark:text-[#8A9BA8] uppercase mb-3">Inputs</div>
                <div className="space-y-2">
                  {THEORY_OF_CHANGE.inputs.map((input) => (
                    <div key={input.id} className="flex items-center gap-2 p-2 bg-[#EEF4F8] dark:bg-blue-900/20 rounded-lg text-sm">
                      <input.icon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-[#3A4A57] dark:text-gray-300">{input.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center text-[#8A9BA8]">→</div>

              {/* Activities */}
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#5A6B7A] dark:text-[#8A9BA8] uppercase mb-3">Activities</div>
                <div className="space-y-2">
                  {THEORY_OF_CHANGE.activities.map((activity) => (
                    <div key={activity.id} className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-[#3A4A57] dark:text-gray-300">
                      {activity.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center text-[#8A9BA8]">→</div>

              {/* Outputs */}
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#5A6B7A] dark:text-[#8A9BA8] uppercase mb-3">Outputs</div>
                <div className="space-y-2">
                  {THEORY_OF_CHANGE.outputs.map((output) => (
                    <div key={output.id} className="p-2 bg-[#6B9080]/10 dark:bg-[#6B9080]/10 rounded-lg text-sm text-[#3A4A57] dark:text-gray-300">
                      {output.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center text-[#8A9BA8]">→</div>

              {/* Outcomes */}
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#5A6B7A] dark:text-[#8A9BA8] uppercase mb-3">Outcomes</div>
                <div className="space-y-2">
                  {THEORY_OF_CHANGE.outcomes.map((outcome) => (
                    <div key={outcome.id} className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                      <div className="text-[#3A4A57] dark:text-gray-300">{outcome.label}</div>
                      <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Target: {outcome.target}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center text-[#8A9BA8]">→</div>

              {/* Impact */}
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#5A6B7A] dark:text-[#8A9BA8] uppercase mb-3">Impact</div>
                <div className="space-y-2">
                  {THEORY_OF_CHANGE.impact.map((impact) => (
                    <div key={impact.id} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-[#3A4A57] dark:text-gray-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      {impact.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeView === 'iris' && (
        <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
          <h3 className="font-semibold text-[#132F43] dark:text-white mb-4 text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#6B9080]" />
            IRIS+ Catalog Alignment
          </h3>
          <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mb-4 sm:mb-6">
            Our metrics are aligned with the Global Impact Investing Network (GIIN) IRIS+ system
            for standardized impact measurement and reporting.
          </p>
          <div className="space-y-3 sm:space-y-4">
            {IRIS_METRICS.map((metric) => (
              <div
                key={metric.code}
                className="flex items-center justify-between p-4 bg-[#F6FBFB] dark:bg-slate-900 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {metric.code}
                    </Badge>
                    <span className="font-medium text-[#132F43] dark:text-white">{metric.name}</span>
                  </div>
                  <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mt-1">
                    Category: {metric.category}
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
          <div className="mt-4 sm:mt-6 p-4 bg-[#6B9080]/10 dark:bg-[#6B9080]/10 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#6B9080] dark:text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#6B9080] dark:text-[#7BA7BC]">
                <strong>SDG Alignment:</strong> Our work primarily contributes to SDG 3 (Good Health and Well-being),
                SDG 4 (Quality Education), and SDG 10 (Reduced Inequalities) through improved access to
                developmental support for neurodivergent children and their families.
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ImpactMetricsDashboard;
