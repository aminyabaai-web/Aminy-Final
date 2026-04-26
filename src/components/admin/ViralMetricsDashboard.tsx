/**
 * Viral Metrics Dashboard
 *
 * Displays K-factor and viral growth metrics for admin analytics.
 * Shows referral funnel, conversion rates, and growth trends.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Loader2,
  Share2,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  MousePointerClick,
  UserPlus,
  Zap,
  Target,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  calculateViralMetrics,
  interpretKFactor,
  type ViralMetrics
} from '../../lib/viral-analytics';

interface ViralMetricsDashboardProps {
  className?: string;
}

export function ViralMetricsDashboard({ className }: ViralMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<ViralMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await calculateViralMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('[ViralDashboard] Error:', err);
      setError('Failed to load viral metrics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          <span className="ml-2 text-gray-600 dark:text-slate-400">Loading viral metrics...</span>
        </div>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-12 text-red-600">
          {error || 'Unable to load metrics'}
        </div>
      </Card>
    );
  }

  const kInterpretation = interpretKFactor(metrics.kFactor);

  const getTrendIcon = () => {
    if (metrics.kFactorTrend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (metrics.kFactorTrend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  // Funnel conversion rates
  const clickRate = metrics.totalInvitesSent > 0
    ? Math.round((metrics.totalInvitesClicked / metrics.totalInvitesSent) * 100)
    : 0;
  const signupRate = metrics.totalInvitesClicked > 0
    ? Math.round((metrics.totalInvitesConverted / metrics.totalInvitesClicked) * 100)
    : 0;

  return (
    <Card className={`p-6 ${className}`}>
      {/* Demo Data Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
        <span className="text-amber-600 text-xs font-medium">Demo Data</span>
        <span className="text-amber-700/70 text-xs">Sample viral metrics. Connect referral backend for real data.</span>
      </div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Viral Growth Metrics
        </h3>
        <Badge
          variant="outline"
          className={`${
            kInterpretation.status === 'viral' ? 'bg-green-100 text-green-700 border-green-300' :
            kInterpretation.status === 'growing' ? 'bg-blue-100 text-blue-700 border-blue-300' :
            kInterpretation.status === 'stable' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
            'bg-red-100 text-red-700 border-red-300'
          }`}
        >
          {kInterpretation.status.charAt(0).toUpperCase() + kInterpretation.status.slice(1)}
        </Badge>
      </div>

      {/* K-Factor Hero */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 mb-4 sm:mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Viral Coefficient (K-Factor)</p>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-5xl font-bold ${kInterpretation.color}`}>
              {metrics.kFactor.toFixed(2)}
            </span>
            {getTrendIcon()}
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-2 max-w-xs mx-auto">
            {kInterpretation.message}
          </p>
          {metrics.weekOverWeekGrowth !== 0 && (
            <p className={`text-xs mt-2 ${metrics.weekOverWeekGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.weekOverWeekGrowth > 0 ? '+' : ''}{metrics.weekOverWeekGrowth}% week over week
            </p>
          )}
        </div>
      </div>

      {/* K-Factor Components */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">Avg Invites/User</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.avgInvitesSent.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">Conversion Rate</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.conversionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Referral Funnel */}
      <div className="mb-4 sm:mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Referral Funnel</h4>
        <div className="flex items-center justify-between gap-2">
          {/* Invites Sent */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-1">
              <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.totalInvitesSent}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Sent</p>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-400" />

          {/* Clicked */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-1">
              <MousePointerClick className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.totalInvitesClicked}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Clicked ({clickRate}%)</p>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-400" />

          {/* Converted */}
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-1">
              <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.totalInvitesConverted}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Converted ({signupRate}%)</p>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <Users className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-gray-500 dark:text-slate-400 text-xs">Users Who Invited</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {metrics.usersWhoInvited} / {metrics.totalUsers}
              <span className="text-gray-400 ml-1">
                ({metrics.totalUsers > 0 ? Math.round((metrics.usersWhoInvited / metrics.totalUsers) * 100) : 0}%)
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <Clock className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-gray-500 dark:text-slate-400 text-xs">Avg Time to First Invite</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {metrics.avgTimeToFirstInvite.toFixed(1)} days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <Clock className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-gray-500 dark:text-slate-400 text-xs">Avg Time to Conversion</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {metrics.avgTimeToConversion.toFixed(1)} days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-gray-500 dark:text-slate-400 text-xs">Total Users</p>
            <p className="font-medium text-gray-900 dark:text-white">{metrics.totalUsers}</p>
          </div>
        </div>
      </div>

      {/* K-Factor Target */}
      <div className="mt-4 sm:mt-6 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5" />
          <div>
            <p className="font-medium text-teal-800 dark:text-teal-300">Target: K &gt; 1.0</p>
            <p className="text-sm text-teal-700 dark:text-teal-400">
              {metrics.kFactor >= 1
                ? "You've achieved viral growth! Each user brings more than one new user."
                : `Need ${((1 - metrics.kFactor) / metrics.kFactor * 100).toFixed(0)}% more conversions or invites to reach viral threshold.`
              }
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ViralMetricsDashboard;
