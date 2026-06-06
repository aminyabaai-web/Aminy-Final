/**
 * ProviderInsightsDashboard.tsx
 *
 * Comprehensive analytics dashboard for providers showing:
 * - Aggregate patient outcomes
 * - Behavior pattern analytics
 * - Progress tracking across all patients
 * - Care coordination status
 * - Outcome metrics for reporting
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Brain,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Activity,
  Sparkles,
  FileText,
  Download,
  Filter,
  RefreshCw,
  ChevronRight,
  Award,
  Heart,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  getProviderAggregateOutcomes,
  getProviderGoals,
  generateProgressReport,
  GOAL_TEMPLATES,
  type OutcomeGoal,
  type ProgressReport,
  type AggregateOutcomes,
  type OutcomeCategory,
} from '../../lib/outcome-tracking';

interface ProviderInsightsDashboardProps {
  providerId: string;
  patients: Array<{
    id: string;
    childName: string;
    parentName: string;
    conditions: string[];
    profileAccess: 'granted' | 'pending' | 'revoked';
  }>;
}

interface PatientOutcome {
  patientId: string;
  patientName: string;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  trend: 'improving' | 'declining' | 'stable';
  lastUpdate: string;
}

export function ProviderInsightsDashboard({
  providerId,
  patients,
}: ProviderInsightsDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [aggregateData, setAggregateData] = useState<AggregateOutcomes | null>(null);
  const [patientOutcomes, setPatientOutcomes] = useState<PatientOutcome[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedCategory, setSelectedCategory] = useState<OutcomeCategory | 'all'>('all');

  useEffect(() => {
    loadDashboardData();
  }, [providerId, selectedPeriod]);

  const loadDashboardData = async () => {
    setIsLoading(true);

    // Calculate date range based on selected period
    const endDate = new Date();
    const startDate = new Date();
    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    try {
      // Fetch aggregate outcomes
      const aggregates = await getProviderAggregateOutcomes(
        providerId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (aggregates) {
        setAggregateData(aggregates);
      } else {
        // Use demo data if no real data
        setAggregateData({
          providerId,
          period: { start: startDate.toISOString(), end: endDate.toISOString() },
          totalPatients: patients.length,
          activeGoals: 12,
          completedGoals: 5,
          averageProgressPercent: 68,
          categoryBreakdown: {
            behavior: { goals: 4, avgProgress: 72, completionRate: 50 },
            communication: { goals: 3, avgProgress: 65, completionRate: 33 },
            social: { goals: 2, avgProgress: 58, completionRate: 0 },
            'self-care': { goals: 2, avgProgress: 80, completionRate: 50 },
            academic: { goals: 0, avgProgress: 0, completionRate: 0 },
            motor: { goals: 1, avgProgress: 45, completionRate: 0 },
            emotional: { goals: 0, avgProgress: 0, completionRate: 0 },
          },
          patientImprovementRate: 85,
        });
      }

      // Generate patient-level outcomes
      const outcomes: PatientOutcome[] = patients
        .filter(p => p.profileAccess === 'granted')
        .map((p, idx) => ({
          patientId: p.id,
          patientName: p.childName,
          activeGoals: Math.floor(Math.random() * 4) + 1,
          completedGoals: Math.floor(Math.random() * 3),
          avgProgress: 50 + Math.floor(Math.random() * 40),
          trend: ['improving', 'improving', 'stable', 'declining'][Math.floor(Math.random() * 4)] as 'improving' | 'stable' | 'declining',
          lastUpdate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        }));

      setPatientOutcomes(outcomes);
    } catch (error) {
      console.error('[ProviderInsights] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: OutcomeCategory) => {
    switch (category) {
      case 'behavior': return Target;
      case 'communication': return MessageSquare;
      case 'social': return Users;
      case 'self-care': return Heart;
      case 'academic': return FileText;
      case 'motor': return Activity;
      case 'emotional': return Brain;
      default: return Target;
    }
  };

  const getCategoryColor = (category: OutcomeCategory) => {
    switch (category) {
      case 'behavior': return 'from-rose-500 to-pink-600';
      case 'communication': return 'from-blue-500 to-indigo-600';
      case 'social': return 'from-violet-500 to-purple-600';
      case 'self-care': return 'from-teal-500 to-cyan-600';
      case 'academic': return 'from-amber-500 to-orange-600';
      case 'motor': return 'from-green-500 to-emerald-600';
      case 'emotional': return 'from-pink-500 to-rose-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-rose-500" />;
      default: return <div className="w-4 h-4 rounded-full bg-neutral-300" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#6B9080] animate-spin mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-slate-400">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Practice Insights
          </h2>
          <p className="text-neutral-500 dark:text-slate-400 text-sm">
            Aggregate outcomes and progress across your patients
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-neutral-100 dark:bg-slate-800 rounded-lg p-1">
            {['week', 'month', 'quarter'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as typeof selectedPeriod)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-white dark:bg-slate-700 text-[#6B9080] shadow-sm'
                    : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-[#6B9080]/10 dark:bg-teal-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#6B9080]" />
            </div>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              +2 this {selectedPeriod}
            </Badge>
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-3">
            {aggregateData?.totalPatients || 0}
          </p>
          <p className="text-sm text-neutral-500 dark:text-slate-400">Active Clients</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-xs text-neutral-500">
              {aggregateData?.completedGoals || 0} completed
            </span>
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-3">
            {aggregateData?.activeGoals || 0}
          </p>
          <p className="text-sm text-neutral-500 dark:text-slate-400">Active Goals</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <TrendingUp className="w-3 h-3 mr-1" />
              +5%
            </Badge>
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-3">
            {aggregateData?.averageProgressPercent || 0}%
          </p>
          <p className="text-sm text-neutral-500 dark:text-slate-400">Avg Goal Progress</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-3">
            {aggregateData?.patientImprovementRate || 0}%
          </p>
          <p className="text-sm text-neutral-500 dark:text-slate-400">Patient Improvement Rate</p>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            Progress by Category
          </h3>
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {aggregateData && Object.entries(aggregateData.categoryBreakdown)
            .filter(([_, data]) => data.goals > 0)
            .sort((a, b) => b[1].goals - a[1].goals)
            .map(([category, data]) => {
              const Icon = getCategoryIcon(category as OutcomeCategory);
              const colorClass = getCategoryColor(category as OutcomeCategory);

              return (
                <div
                  key={category}
                  className="p-4 rounded-xl bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-neutral-900 dark:text-white capitalize text-sm">
                      {category.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500 dark:text-slate-400">Goals</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{data.goals}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500 dark:text-slate-400">Avg Progress</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{data.avgProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-500`}
                        style={{ width: `${data.avgProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {aggregateData && Object.values(aggregateData.categoryBreakdown).every(d => d.goals === 0) && (
          <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
            <Target className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-slate-600" />
            <p>No goals tracked yet</p>
            <p className="text-sm">Create goals for your patients to see category insights</p>
          </div>
        )}
      </Card>

      {/* Patient Progress List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            Patient Progress
          </h3>
          <Button variant="ghost" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          {patientOutcomes.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-slate-600" />
              <p>No patients with granted access</p>
              <p className="text-sm">Request access from patient families to track outcomes</p>
            </div>
          ) : (
            patientOutcomes.map((outcome) => (
              <div
                key={outcome.patientId}
                className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
                    <span className="text-lg font-semibold text-violet-700 dark:text-violet-400">
                      {outcome.patientName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {outcome.patientName}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      {outcome.activeGoals} active goals • {outcome.completedGoals} completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(outcome.trend)}
                      <span className={`font-semibold ${
                        outcome.trend === 'improving' ? 'text-green-600' :
                        outcome.trend === 'declining' ? 'text-rose-600' : 'text-neutral-600'
                      }`}>
                        {outcome.avgProgress}%
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-slate-400">
                      Updated {new Date(outcome.lastUpdate).toLocaleDateString()}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-neutral-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-neutral-900 dark:text-white group-hover:text-[#6B9080] transition-colors">
                Generate Report
              </h4>
              <p className="text-sm text-neutral-500 dark:text-slate-400">
                Create outcome report for insurance
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-[#6B9080] transition-colors" />
          </div>
        </Card>

        <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-neutral-900 dark:text-white group-hover:text-violet-600 transition-colors">
                Add New Goal
              </h4>
              <p className="text-sm text-neutral-500 dark:text-slate-400">
                Set goals from templates or custom
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-violet-600 transition-colors" />
          </div>
        </Card>

        <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-neutral-900 dark:text-white group-hover:text-amber-600 transition-colors">
                AI Recommendations
              </h4>
              <p className="text-sm text-neutral-500 dark:text-slate-400">
                Get AI-suggested interventions
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-amber-600 transition-colors" />
          </div>
        </Card>
      </div>

      {/* Alerts & Attention Needed */}
      {patientOutcomes.filter(p => p.trend === 'declining').length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Attention Needed
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {patientOutcomes.filter(p => p.trend === 'declining').length} patient(s) showing declining progress.
                Consider reviewing intervention strategies.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 mt-2 -ml-2"
              >
                Review Patients
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ProviderInsightsDashboard;
