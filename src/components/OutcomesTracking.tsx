// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * OutcomesTracking.tsx
 *
 * Comprehensive outcomes tracking for three stakeholder groups:
 * 1. Caregivers (Parents) - child progress, stress reduction, engagement
 * 2. Payers (Insurance/Employers) - cost savings, utilization, outcomes
 * 3. Investors - growth metrics, retention, revenue, impact
 *
 * This component shows meaningful metrics that demonstrate value
 * to each stakeholder group in a clear, compelling way.
 */

import React, { useState, useEffect } from 'react';
import { AISparkleButton } from './AISparkleButton';
import { supabase } from '../utils/supabase/client';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Heart,
  DollarSign,
  Users,
  Target,
  Calendar,
  Clock,
  Star,
  Award,
  Zap,
  Brain,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';

// Types
interface CaregiverMetrics {
  childProgress: {
    goalsAchieved: number;
    totalGoals: number;
    currentStreakDays: number;
    improvementAreas: Array<{
      name: string;
      baseline: number;
      current: number;
      target: number;
    }>;
  };
  parentWellbeing: {
    stressLevel: 'low' | 'moderate' | 'high';
    stressTrend: 'improving' | 'stable' | 'worsening';
    confidenceScore: number;
    supportSessions: number;
  };
  engagement: {
    daysActiveThisWeek: number;
    aiConversations: number;
    calmToolsUsed: number;
    carePlanUpdates: number;
  };
  recentWins: string[];
}

interface PayerMetrics {
  costMetrics: {
    estimatedSavingsPerMember: number;
    crisisInterventionsAvoided: number;
    erVisitsReduced: number;
    workdaysSaved: number;
  };
  utilization: {
    memberEngagementRate: number;
    avgSessionsPerMember: number;
    retentionRate: number;
    npsScore: number;
  };
  clinicalOutcomes: {
    behaviorImprovementRate: number;
    parentConfidenceIncrease: number;
    goalsMetRate: number;
    satisfactionRate: number;
  };
  roi: {
    costPerMember: number;
    valueDelivered: number;
    roiMultiple: number;
  };
}

interface InvestorMetrics {
  growth: {
    totalUsers: number;
    userGrowthRate: number;
    mrr: number;
    mrrGrowth: number;
    arr: number;
  };
  retention: {
    day1Retention: number;
    day7Retention: number;
    day30Retention: number;
    monthlyChurn: number;
    ltv: number;
  };
  engagement: {
    dau: number;
    mau: number;
    dauMauRatio: number;
    avgSessionLength: number;
    sessionsPerUser: number;
  };
  revenue: {
    subscriptionRevenue: number;
    telehealthRevenue: number;
    b2bRevenue: number;
    revenuePerUser: number;
  };
  impact: {
    familiesHelped: number;
    goalsAchieved: number;
    crisisesAverted: number;
    parentHoursReclaimed: number;
  };
}

interface OutcomesTrackingProps {
  view: 'caregiver' | 'payer' | 'investor';
  childId?: string;
  organizationId?: string;
  dateRange?: { start: Date; end: Date };
  onExport?: () => void;
}

export function OutcomesTracking({
  view,
  childId,
  organizationId,
  dateRange,
  onExport
}: OutcomesTrackingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [caregiverMetrics, setCaregiverMetrics] = useState<CaregiverMetrics | null>(null);
  const [payerMetrics, setPayerMetrics] = useState<PayerMetrics | null>(null);
  const [investorMetrics, setInvestorMetrics] = useState<InvestorMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadMetrics();
  }, [view, childId, organizationId, selectedPeriod]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      if (view === 'caregiver') {
        await loadCaregiverMetrics();
      }
      // Payer and investor views need aggregate data that isn't available yet.
      // They will render their own empty states via the null check below.
    } finally {
      setIsLoading(false);
    }
  };

  const loadCaregiverMetrics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const periodStart = getPeriodStart(selectedPeriod);

    const [goalsResult, sessionsResult, aiChatsResult] = await Promise.allSettled([
      supabase
        .from('goals')
        .select('id, title, category, is_active, status, progress_percent, baseline_value, current_value, target_value')
        .eq('user_id', user.id),
      supabase
        .from('session_notes')
        .select('id, session_date, billing_status, goals_addressed')
        .eq('user_id', user.id)
        .gte('session_date', periodStart),
      supabase
        .from('audit_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_type', 'AI_CHAT')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const goals = goalsResult.status === 'fulfilled' ? (goalsResult.value.data ?? []) : [];
    const sessions = sessionsResult.status === 'fulfilled' ? (sessionsResult.value.data ?? []) : [];
    const aiChats = aiChatsResult.status === 'fulfilled' ? (aiChatsResult.value.data ?? []) : [];

    const activeGoals = goals.filter((g: { is_active: boolean }) => g.is_active);
    const masteredGoals = goals.filter((g: { status: string }) => g.status === 'mastered' || g.status === 'completed');

    const improvementAreas = activeGoals.slice(0, 4).map((g: {
      title: string; category: string; baseline_value?: number;
      current_value?: number; target_value?: number; progress_percent?: number;
    }) => ({
      name: g.title || g.category || 'Goal',
      baseline: g.baseline_value ?? 0,
      current: g.current_value ?? (g.progress_percent ?? 0),
      target: g.target_value ?? 100,
    }));

    setCaregiverMetrics({
      childProgress: {
        goalsAchieved: masteredGoals.length,
        totalGoals: goals.length,
        currentStreakDays: 0, // requires daily activity tracking — set to 0 until that's wired
        improvementAreas,
      },
      parentWellbeing: {
        stressLevel: 'moderate',
        stressTrend: 'stable',
        confidenceScore: 0,
        supportSessions: sessions.length,
      },
      engagement: {
        daysActiveThisWeek: 0,
        aiConversations: aiChats.length,
        calmToolsUsed: 0,
        carePlanUpdates: 0,
      },
      recentWins: [],
    });
  };

  // Payer / investor views need aggregate data — show empty state until pipeline is built
  if (!isLoading && (view === 'payer' || view === 'investor')) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Aggregate Data Coming Soon</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          {view === 'payer'
            ? 'Payer-level outcomes reporting requires population data across enrolled members. Available once your cohort reaches 10+ families.'
            : 'Investor metrics are populated from your Stripe and Supabase analytics pipeline. Set up the reporting cron to enable this view.'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading outcomes data...</p>
        </div>
      </div>
    );
  }

  // Caregiver: no data yet
  if (view === 'caregiver' && !caregiverMetrics) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Target className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No progress data yet</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          Complete your first session and set therapy goals to start seeing outcomes here.
        </p>
      </div>
    );
  }

  // CAREGIVER VIEW
  if (view === 'caregiver' && caregiverMetrics) {
    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Progress & Outcomes</h2>
              <AISparkleButton
                prompt="Analyze our progress and outcomes — what patterns do you see and what should we focus on next?"
                label="Analyze"
                visual
              />
            </div>
            <p className="text-gray-600">See how far you've come together</p>
          </div>
          <div className="flex gap-2">
            {['week', 'month', 'quarter'].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period as typeof selectedPeriod)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Wins Banner */}
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium text-gray-900">Recent Wins</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {caregiverMetrics.recentWins.map((win, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{win}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Progress Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            icon={Target}
            label="Goals Achieved"
            value={`${caregiverMetrics.childProgress.goalsAchieved}/${caregiverMetrics.childProgress.totalGoals}`}
            trend={+15}
            color="teal"
          />
          <MetricCard
            icon={Zap}
            label="Day Streak"
            value={caregiverMetrics.childProgress.currentStreakDays}
            suffix="days"
            trend={+3}
            color="violet"
          />
          <MetricCard
            icon={Heart}
            label="Confidence"
            value={caregiverMetrics.parentWellbeing.confidenceScore}
            suffix="%"
            trend={+12}
            color="pink"
          />
          <MetricCard
            icon={Brain}
            label="AI Chats"
            value={caregiverMetrics.engagement.aiConversations}
            suffix="this week"
            color="blue"
          />
        </div>

        {/* Improvement Areas */}
        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Skill Progress
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {caregiverMetrics.childProgress.improvementAreas.map((area, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{area.name}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">{area.baseline}%</span>
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                    <span className="text-green-600 font-medium">{area.current}%</span>
                    <span className="text-gray-400">/ {area.target}%</span>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={area.current} className="h-2" />
                  <div
                    className="absolute top-0 h-2 w-0.5 bg-gray-400"
                    style={{ left: `${area.target}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Parent Wellbeing */}
        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            Your Wellbeing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-xl sm:text-2xl font-bold ${
                caregiverMetrics.parentWellbeing.stressLevel === 'low' ? 'text-green-600' :
                caregiverMetrics.parentWellbeing.stressLevel === 'moderate' ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {caregiverMetrics.parentWellbeing.stressLevel.charAt(0).toUpperCase() +
                 caregiverMetrics.parentWellbeing.stressLevel.slice(1)}
              </div>
              <div className="text-sm text-gray-600">Stress Level</div>
              {caregiverMetrics.parentWellbeing.stressTrend === 'improving' && (
                <Badge className="mt-2 bg-green-100 text-green-700">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Improving
                </Badge>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-teal-600">
                {caregiverMetrics.parentWellbeing.confidenceScore}%
              </div>
              <div className="text-sm text-gray-600">Confidence Score</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-violet-600">
                {caregiverMetrics.parentWellbeing.supportSessions}
              </div>
              <div className="text-sm text-gray-600">Support Sessions</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // PAYER VIEW
  if (view === 'payer' && payerMetrics) {
    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Outcomes Dashboard</h2>
            <p className="text-gray-600">Aminy Program Performance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* ROI Highlight */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium mb-1">Return on Investment</p>
              <div className="text-4xl font-bold text-green-900">
                {payerMetrics.roi.roiMultiple}x
              </div>
              <p className="text-sm text-green-700 mt-1">
                ${payerMetrics.roi.costPerMember}/member → ${payerMetrics.roi.valueDelivered} value
              </p>
            </div>
            <div className="p-4 bg-green-100 rounded-xl">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Cost Savings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            icon={DollarSign}
            label="Savings/Member"
            value={`$${payerMetrics.costMetrics.estimatedSavingsPerMember.toLocaleString()}`}
            trend={+8}
            color="green"
          />
          <MetricCard
            icon={Activity}
            label="Crisis Avoided"
            value={payerMetrics.costMetrics.crisisInterventionsAvoided}
            trend={+12}
            color="teal"
          />
          <MetricCard
            icon={Heart}
            label="ER Visits Reduced"
            value={payerMetrics.costMetrics.erVisitsReduced}
            trend={+5}
            color="red"
          />
          <MetricCard
            icon={Calendar}
            label="Workdays Saved"
            value={payerMetrics.costMetrics.workdaysSaved}
            trend={+15}
            color="blue"
          />
        </div>

        {/* Utilization & Outcomes */}
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-4">Utilization Metrics</h3>
            <div className="space-y-3 sm:space-y-4">
              <MetricRow
                label="Member Engagement Rate"
                value={`${payerMetrics.utilization.memberEngagementRate}%`}
                progress={payerMetrics.utilization.memberEngagementRate}
              />
              <MetricRow
                label="Avg Sessions/Member"
                value={payerMetrics.utilization.avgSessionsPerMember.toString()}
                progress={payerMetrics.utilization.avgSessionsPerMember * 20}
              />
              <MetricRow
                label="Retention Rate"
                value={`${payerMetrics.utilization.retentionRate}%`}
                progress={payerMetrics.utilization.retentionRate}
              />
              <MetricRow
                label="NPS Score"
                value={payerMetrics.utilization.npsScore.toString()}
                progress={payerMetrics.utilization.npsScore}
              />
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-4">Clinical Outcomes</h3>
            <div className="space-y-3 sm:space-y-4">
              <MetricRow
                label="Behavior Improvement"
                value={`${payerMetrics.clinicalOutcomes.behaviorImprovementRate}%`}
                progress={payerMetrics.clinicalOutcomes.behaviorImprovementRate}
                color="green"
              />
              <MetricRow
                label="Parent Confidence ↑"
                value={`+${payerMetrics.clinicalOutcomes.parentConfidenceIncrease}%`}
                progress={payerMetrics.clinicalOutcomes.parentConfidenceIncrease}
                color="violet"
              />
              <MetricRow
                label="Goals Met Rate"
                value={`${payerMetrics.clinicalOutcomes.goalsMetRate}%`}
                progress={payerMetrics.clinicalOutcomes.goalsMetRate}
                color="teal"
              />
              <MetricRow
                label="Member Satisfaction"
                value={`${payerMetrics.clinicalOutcomes.satisfactionRate}%`}
                progress={payerMetrics.clinicalOutcomes.satisfactionRate}
                color="amber"
              />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // INVESTOR VIEW
  if (view === 'investor' && investorMetrics) {
    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Investor Dashboard</h2>
            <p className="text-gray-600">Key Performance Metrics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* ARR Highlight */}
        <Card className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-violet-700 font-medium mb-1">Annual Recurring Revenue</p>
              <div className="text-4xl font-bold text-violet-900">
                ${(investorMetrics.growth.arr / 1000000).toFixed(2)}M
              </div>
              <p className="text-sm text-violet-700 mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {investorMetrics.growth.mrrGrowth}% MoM Growth
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-violet-900">
                ${investorMetrics.growth.mrr.toLocaleString()}
              </div>
              <p className="text-sm text-violet-600">MRR</p>
            </div>
          </div>
        </Card>

        {/* Growth Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            icon={Users}
            label="Total Users"
            value={investorMetrics.growth.totalUsers.toLocaleString()}
            trend={investorMetrics.growth.userGrowthRate}
            color="blue"
          />
          <MetricCard
            icon={Activity}
            label="DAU/MAU"
            value={`${investorMetrics.engagement.dauMauRatio}%`}
            trend={+5}
            color="teal"
          />
          <MetricCard
            icon={DollarSign}
            label="LTV"
            value={`$${investorMetrics.retention.ltv}`}
            trend={+12}
            color="green"
          />
          <MetricCard
            icon={TrendingDown}
            label="Monthly Churn"
            value={`${investorMetrics.retention.monthlyChurn}%`}
            trend={-0.5}
            isNegativeGood
            color="red"
          />
        </div>

        {/* Detailed Metrics */}
        <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
          {/* Retention */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Retention
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">D1 Retention</span>
                <span className="font-medium">{investorMetrics.retention.day1Retention}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">D7 Retention</span>
                <span className="font-medium">{investorMetrics.retention.day7Retention}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">D30 Retention</span>
                <span className="font-medium">{investorMetrics.retention.day30Retention}%</span>
              </div>
            </div>
          </Card>

          {/* Engagement */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" />
              Engagement
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">DAU</span>
                <span className="font-medium">{investorMetrics.engagement.dau.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">MAU</span>
                <span className="font-medium">{investorMetrics.engagement.mau.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Session</span>
                <span className="font-medium">{investorMetrics.engagement.avgSessionLength}m</span>
              </div>
            </div>
          </Card>

          {/* Revenue Mix */}
          <Card className="p-3 sm:p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Revenue Mix
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Subscriptions</span>
                <span className="font-medium">${(investorMetrics.revenue.subscriptionRevenue / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Telehealth</span>
                <span className="font-medium">${(investorMetrics.revenue.telehealthRevenue / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">B2B</span>
                <span className="font-medium">${(investorMetrics.revenue.b2bRevenue / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Impact Metrics */}
        <Card className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            Impact Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 text-center">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-pink-600">
                {investorMetrics.impact.familiesHelped.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Families Helped</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-pink-600">
                {investorMetrics.impact.goalsAchieved.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Goals Achieved</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-pink-600">
                {investorMetrics.impact.crisisesAverted.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Crises Averted</p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-pink-600">
                {(investorMetrics.impact.parentHoursReclaimed / 1000).toFixed(1)}K
              </div>
              <p className="text-sm text-gray-600">Parent Hours Saved</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}

// Helper Components
function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  trend,
  isNegativeGood = false,
  color
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  trend?: number;
  isNegativeGood?: boolean;
  color: 'teal' | 'violet' | 'pink' | 'blue' | 'green' | 'red' | 'amber';
}) {
  const colorClasses = {
    teal: 'bg-teal-100 text-teal-600',
    violet: 'bg-violet-100 text-violet-600',
    pink: 'bg-pink-100 text-pink-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600'
  };

  const isPositive = isNegativeGood ? (trend && trend < 0) : (trend && trend > 0);

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl sm:text-2xl font-bold text-gray-900">{value}</span>
        {suffix && <span className="text-sm text-gray-500 mb-1">{suffix}</span>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </Card>
  );
}

function MetricRow({
  label,
  value,
  progress,
  color = 'blue'
}: {
  label: string;
  value: string;
  progress: number;
  color?: 'blue' | 'green' | 'violet' | 'teal' | 'amber';
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">{value}</span>
      </div>
      <Progress value={Math.min(progress, 100)} className="h-1.5" />
    </div>
  );
}

/**
 * Compact outcomes widget for dashboard
 */
export function OutcomesWidget({
  goalsAchieved,
  totalGoals,
  streakDays,
  confidenceScore,
  onViewDetails
}: {
  goalsAchieved: number;
  totalGoals: number;
  streakDays: number;
  confidenceScore: number;
  onViewDetails?: () => void;
}) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Your Progress</h3>
        {onViewDetails && (
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            View All
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-center">
        <div className="p-2 bg-teal-50 rounded-lg">
          <div className="text-lg font-bold text-teal-600">
            {goalsAchieved}/{totalGoals}
          </div>
          <p className="text-xs text-gray-600">Goals</p>
        </div>
        <div className="p-2 bg-violet-50 rounded-lg">
          <div className="text-lg font-bold text-violet-600">
            {streakDays}
          </div>
          <p className="text-xs text-gray-600">Day Streak</p>
        </div>
        <div className="p-2 bg-pink-50 rounded-lg">
          <div className="text-lg font-bold text-pink-600">
            {confidenceScore}%
          </div>
          <p className="text-xs text-gray-600">Confidence</p>
        </div>
      </div>
    </Card>
  );
}

function getPeriodStart(period: 'week' | 'month' | 'quarter' | 'year'): string {
  const now = new Date();
  if (period === 'week') {
    now.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    now.setMonth(now.getMonth() - 1);
  } else if (period === 'quarter') {
    now.setMonth(now.getMonth() - 3);
  } else {
    now.setFullYear(now.getFullYear() - 1);
  }
  return now.toISOString().split('T')[0];
}
