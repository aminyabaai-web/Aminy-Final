/**
 * PayorDashboard.tsx
 *
 * Dashboard for payors/insurers showing:
 * - Utilization metrics
 * - Cost-effectiveness analysis
 * - Outcome reporting
 * - HEDIS/Quality metrics
 * - Export functionality
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Heart,
  Shield,
  Download,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  RefreshCw,
  FileText,
  PieChart,
  Activity,
  Clock,
  Star,
  Award,
  Sparkles,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  getPayorDashboardData,
  getQualityMetrics,
  generateExportData,
  type PayorDashboardData,
  type QualityMetrics,
} from '../lib/payor-reporting';

interface PayorDashboardProps {
  payorId: string;
  payorName?: string;
}

export function PayorDashboard({ payorId, payorName = 'Health Plan' }: PayorDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<PayorDashboardData | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'3' | '6' | '12'>('6');
  const [activeTab, setActiveTab] = useState<'overview' | 'utilization' | 'outcomes' | 'cost' | 'quality'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [payorId, selectedPeriod]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashboardData, quality] = await Promise.all([
        getPayorDashboardData(payorId, parseInt(selectedPeriod)),
        getQualityMetrics(payorId),
      ]);
      setData(dashboardData);
      setQualityMetrics(quality);
    } catch (error) {
      console.error('[PayorDashboard] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'json') => {
    setIsExporting(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - parseInt(selectedPeriod));

      const exportData = await generateExportData(
        payorId,
        startDate.toISOString(),
        endDate.toISOString(),
        {
          format,
          includeUtilization: true,
          includeCostEffectiveness: true,
          includeOutcomes: true,
          includeTrends: true,
        }
      );

      // Trigger download
      if (format === 'csv' && exportData.csvContent) {
        const blob = new Blob([exportData.csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aminy-payor-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else if (format === 'json' && exportData.jsonContent) {
        const blob = new Blob([exportData.jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aminy-payor-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }
    } catch (error) {
      console.error('[PayorDashboard] Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-slate-400">Loading payor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#1B2733] dark:text-white">
                  {payorName} Analytics
                </h1>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Aminy Payor Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-neutral-100 dark:bg-slate-800 rounded-lg p-1">
                {(['3', '6', '12'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      selectedPeriod === period
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                        : 'text-neutral-600 dark:text-slate-400 hover:text-[#1B2733]'
                    }`}
                  >
                    {period}M
                  </button>
                ))}
              </div>

              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-slate-900 border-b border-neutral-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'utilization', label: 'Utilization', icon: Activity },
              { id: 'outcomes', label: 'Outcomes', icon: Target },
              { id: 'cost', label: 'Cost Analysis', icon: DollarSign },
              { id: 'quality', label: 'Quality Metrics', icon: Award },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-[#EEF4F8]/50 dark:bg-blue-900/20'
                    : 'border-transparent text-[#5A6B7A] hover:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="space-y-3 mb-6">
            {data.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  alert.type === 'positive'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : alert.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    : 'bg-[#EEF4F8] dark:bg-blue-900/20 border border-[#C8DDE8] dark:border-blue-800'
                }`}
              >
                {alert.type === 'positive' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : alert.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${
                    alert.type === 'positive' ? 'text-green-800 dark:text-green-200' :
                    alert.type === 'warning' ? 'text-amber-800 dark:text-amber-200' :
                    'text-[#4A6478] dark:text-blue-200'
                  }`}>
                    {alert.message}
                  </p>
                  {alert.value && (
                    <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
                      Current value: {alert.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +8%
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.utilization.activeMembers.toLocaleString()}
                </p>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Active Members</p>
                <p className="text-xs text-neutral-400 mt-1">
                  of {data.utilization.totalMembers.toLocaleString()} total
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-violet-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    +27%
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.outcomes.goalAchievementRate}%
                </p>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Goal Achievement</p>
                <p className="text-xs text-neutral-400 mt-1">
                  vs 45% industry avg
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    -59%
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  ${data.costEffectiveness.avgCostPerImprovedOutcome}
                </p>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Cost/Outcome</p>
                <p className="text-xs text-neutral-400 mt-1">
                  vs $450 industry avg
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.outcomes.memberSatisfactionScore}
                </p>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Member Satisfaction</p>
                <p className="text-xs text-neutral-400 mt-1">
                  out of 5.0
                </p>
              </Card>
            </div>

            {/* Trends Chart (Simplified) */}
            <Card className="p-6">
              <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">
                Performance Trends
              </h3>
              <div className="space-y-4">
                {data.trends.map((month, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-16 text-sm text-[#5A6B7A]">{month.month}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-neutral-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${month.engagement}%` }}
                        />
                      </div>
                      <span className="w-12 text-sm text-neutral-600">{month.engagement}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-neutral-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-[#5A6B7A]">Engagement Rate</span>
                </div>
              </div>
            </Card>

            {/* Benchmark Comparison */}
            <Card className="p-6">
              <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">
                Benchmark Comparison
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {data.costEffectiveness.benchmarkComparison.map((benchmark, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-neutral-50 dark:bg-slate-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                        {benchmark.metric}
                      </span>
                      <Badge className="bg-green-100 text-green-700">
                        +{benchmark.percentBetter}% better
                      </Badge>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                          {typeof benchmark.aminyValue === 'number' && benchmark.aminyValue < 10
                            ? benchmark.aminyValue.toFixed(1)
                            : benchmark.aminyValue}
                          {benchmark.metric.includes('Rate') || benchmark.metric.includes('Achievement') ? '%' : ''}
                        </p>
                        <p className="text-xs text-[#5A6B7A]">Aminy</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg text-neutral-400">
                          {typeof benchmark.industryAvg === 'number' && benchmark.industryAvg < 10
                            ? benchmark.industryAvg.toFixed(1)
                            : benchmark.industryAvg}
                          {benchmark.metric.includes('Rate') || benchmark.metric.includes('Achievement') ? '%' : ''}
                        </p>
                        <p className="text-xs text-[#5A6B7A]">Industry Avg</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'utilization' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Total Sessions</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.utilization.totalSessions.toLocaleString()}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Avg Sessions/Member</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.utilization.avgSessionsPerMember}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Engagement Rate</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.utilization.engagementRate}%
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Avg Minutes/Session</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.utilization.avgMinutesPerSession}
                </p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">
                Utilization by Service Type
              </h3>
              <div className="space-y-4">
                {Object.entries(data.utilization.byServiceType).map(([service, metrics]) => (
                  <div key={service} className="p-4 rounded-lg bg-neutral-50 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[#1B2733] dark:text-white">{service}</span>
                      <span className="text-sm text-[#5A6B7A]">{metrics.uniqueMembers} members</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[#5A6B7A]">Sessions:</span>
                        <span className="ml-2 font-medium text-[#1B2733] dark:text-white">
                          {metrics.sessions.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5A6B7A]">Minutes:</span>
                        <span className="ml-2 font-medium text-[#1B2733] dark:text-white">
                          {metrics.minutes.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'outcomes' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Goals Tracked</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.outcomes.totalGoalsTracked.toLocaleString()}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Goals Achieved</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.outcomes.goalsAchieved.toLocaleString()}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Member Improvement</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.outcomes.memberImprovementRate}%
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Clinical Significance</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.outcomes.clinicallySignificantImprovement}%
                </p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">
                Outcomes by Category
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(data.outcomes.byCategory).map(([category, metrics]) => (
                  <div key={category} className="p-4 rounded-lg bg-neutral-50 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-[#1B2733] dark:text-white capitalize">
                        {category.replace('-', ' ')}
                      </span>
                      <span className="text-sm text-green-600">{metrics.avgProgress}%</span>
                    </div>
                    <div className="h-2 bg-neutral-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${metrics.avgProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#5A6B7A]">
                      <span>{metrics.achieved} achieved</span>
                      <span>{metrics.goals} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'cost' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">PMPM Cost</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  ${data.costEffectiveness.avgCostPerMember.toFixed(2)}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Est. Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${data.costEffectiveness.costSavingsEstimate.toLocaleString()}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Crises Prevented</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.costEffectiveness.preventedCrisisEvents}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">ER Visits Avoided</p>
                <p className="text-2xl font-bold text-[#1B2733] dark:text-white">
                  {data.costEffectiveness.reducedERVisits}
                </p>
              </Card>
            </div>

            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-800 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    ROI Summary
                  </h3>
                  <p className="text-green-700 dark:text-green-300 mt-1">
                    Based on prevented crisis events ($8,500 avg cost), reduced ER visits ($1,200 avg),
                    and improved medication adherence savings, the estimated ROI for this period is
                    <span className="font-bold text-green-800 dark:text-green-200"> 4.2x </span>
                    the investment in Aminy services.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'quality' && qualityMetrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-5 text-center">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">NCQA Score</p>
                <p className="text-3xl font-bold text-[#1B2733] dark:text-white">
                  {qualityMetrics.ncqaScore}
                </p>
                <p className="text-xs text-neutral-400">out of 5.0</p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Star Rating</p>
                <div className="flex justify-center gap-1 my-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= qualityMetrics.starRating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-neutral-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-neutral-400">{qualityMetrics.starRating} Stars</p>
              </Card>
              <Card className="p-5 text-center">
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">HEDIS Measures</p>
                <p className="text-3xl font-bold text-green-600">
                  {qualityMetrics.hedisCompliance.filter(h => h.status === 'exceeds').length}/
                  {qualityMetrics.hedisCompliance.length}
                </p>
                <p className="text-xs text-neutral-400">exceeding benchmark</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">
                HEDIS Compliance Measures
              </h3>
              <div className="space-y-4">
                {qualityMetrics.hedisCompliance.map((measure, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-neutral-50 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[#1B2733] dark:text-white">
                        {measure.measure}
                      </span>
                      <Badge className={
                        measure.status === 'exceeds'
                          ? 'bg-green-100 text-green-700'
                          : measure.status === 'meets'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }>
                        {measure.status === 'exceeds' ? 'Exceeds' : measure.status === 'meets' ? 'Meets' : 'Below'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-2 bg-neutral-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              measure.status === 'exceeds' ? 'bg-green-500' :
                              measure.status === 'meets' ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${measure.rate}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-[#1B2733] dark:text-white">{measure.rate}%</span>
                        <span className="text-neutral-400">/ {measure.benchmark}% benchmark</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default PayorDashboard;
