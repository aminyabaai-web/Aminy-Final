// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Cohort Retention Analysis
 *
 * Displays user retention data by signup cohort (week/month).
 * Shows D1, D7, D14, D30 retention rates.
 * Helps identify trends and issues in user retention.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface CohortData {
  cohort: string; // Week or month label
  cohortStart: Date;
  totalUsers: number;
  d1Retention: number;
  d7Retention: number;
  d14Retention: number;
  d30Retention: number;
}

interface CohortAnalysisProps {
  period?: 'weekly' | 'monthly';
  limit?: number;
}

export function CohortAnalysis({ period = 'weekly', limit = 8 }: CohortAnalysisProps) {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCohortData();
  }, [period, limit]);

  const loadCohortData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all profiles with signup dates
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        setCohorts([]);
        return;
      }

      // Fetch activity data (messages sent indicates activity)
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, created_at, conversation_id');

      if (messagesError) throw messagesError;

      // Fetch conversation to user mapping
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, user_id, created_at');

      // Build user activity map
      const userActivity: Map<string, Date[]> = new Map();

      conversations?.forEach(conv => {
        const userMessages = messages?.filter(m => m.conversation_id === conv.id) || [];
        userMessages.forEach(msg => {
          const dates = userActivity.get(conv.user_id) || [];
          dates.push(new Date(msg.created_at));
          userActivity.set(conv.user_id, dates);
        });
      });

      // Group users into cohorts
      const cohortMap: Map<string, { users: Array<{ id: string; createdAt: Date }> }> = new Map();

      profiles.forEach(profile => {
        const createdAt = new Date(profile.created_at);
        const cohortKey = period === 'weekly'
          ? getWeekKey(createdAt)
          : getMonthKey(createdAt);

        if (!cohortMap.has(cohortKey)) {
          cohortMap.set(cohortKey, { users: [] });
        }
        cohortMap.get(cohortKey)!.users.push({
          id: profile.id,
          createdAt
        });
      });

      // Calculate retention for each cohort
      const cohortResults: CohortData[] = [];

      cohortMap.forEach((data, key) => {
        const cohortUsers = data.users;
        const cohortStart = cohortUsers[0]?.createdAt || new Date();

        const d1Active = cohortUsers.filter(u => wasActiveAfterDays(u.id, u.createdAt, 1, userActivity)).length;
        const d7Active = cohortUsers.filter(u => wasActiveAfterDays(u.id, u.createdAt, 7, userActivity)).length;
        const d14Active = cohortUsers.filter(u => wasActiveAfterDays(u.id, u.createdAt, 14, userActivity)).length;
        const d30Active = cohortUsers.filter(u => wasActiveAfterDays(u.id, u.createdAt, 30, userActivity)).length;

        const total = cohortUsers.length;

        cohortResults.push({
          cohort: key,
          cohortStart,
          totalUsers: total,
          d1Retention: total > 0 ? Math.round((d1Active / total) * 1000) / 10 : 0,
          d7Retention: total > 0 ? Math.round((d7Active / total) * 1000) / 10 : 0,
          d14Retention: total > 0 ? Math.round((d14Active / total) * 1000) / 10 : 0,
          d30Retention: total > 0 ? Math.round((d30Active / total) * 1000) / 10 : 0,
        });
      });

      // Sort by cohort date (most recent first) and limit
      cohortResults.sort((a, b) => b.cohortStart.getTime() - a.cohortStart.getTime());
      setCohorts(cohortResults.slice(0, limit));

    } catch (err) {
      console.error('[CohortAnalysis] Error:', err);
      setError('Failed to load cohort data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Get week key (e.g., "Jan 6-12")
  const getWeekKey = (date: Date): string => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()}-${endOfWeek.getDate()}`;
  };

  // Helper: Get month key (e.g., "Jan 2026")
  const getMonthKey = (date: Date): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Helper: Check if user was active after N days from signup
  const wasActiveAfterDays = (
    userId: string,
    signupDate: Date,
    days: number,
    activityMap: Map<string, Date[]>
  ): boolean => {
    const activities = activityMap.get(userId) || [];
    const targetDate = new Date(signupDate.getTime() + days * 24 * 60 * 60 * 1000);
    const endDate = new Date(signupDate.getTime() + (days + 1) * 24 * 60 * 60 * 1000);

    return activities.some(date => date >= targetDate && date < endDate);
  };

  // Helper: Get color based on retention rate
  const getRetentionColor = (rate: number): string => {
    if (rate >= 60) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (rate >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (rate >= 20) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  // Helper: Get trend indicator
  const getTrendIndicator = (current: number, previous: number | null) => {
    if (previous === null) return null;
    const diff = current - previous;
    if (diff > 5) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (diff < -5) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-[#8A9BA8]" />;
  };

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#6B9080]" />
          <span className="ml-2 text-[#5A6B7A] dark:text-slate-400">Loading cohort data...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="text-center py-12 text-red-600">
          {error}
        </div>
      </Card>
    );
  }

  if (cohorts.length === 0) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="text-center py-12 text-[#5A6B7A] dark:text-slate-400">
          No cohort data available yet. Users will appear here once they sign up.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1B2733] dark:text-white">
          Cohort Retention Analysis
        </h3>
        <Badge variant="outline" className="text-xs">
          {period === 'weekly' ? 'Weekly' : 'Monthly'} Cohorts
        </Badge>
      </div>

      {/* Retention Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E4DF] dark:border-slate-700">
              <th className="text-left py-3 px-2 font-medium text-[#5A6B7A] dark:text-slate-400">Cohort</th>
              <th className="text-center py-3 px-2 font-medium text-[#5A6B7A] dark:text-slate-400">Users</th>
              <th className="text-center py-3 px-2 font-medium text-[#5A6B7A] dark:text-slate-400">D1</th>
              <th className="text-center py-3 px-2 font-medium text-[#5A6B7A] dark:text-slate-400">D7</th>
              <th className="text-center py-3 px-2 font-medium text-[#5A6B7A] dark:text-slate-400">D14</th>
              <th className="text-center py-3 px-2 font-medium text-[#5A6B7A] dark:text-slate-400">D30</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort, index) => {
              const prevCohort = cohorts[index + 1] || null;
              return (
                <tr key={cohort.cohort} className="border-b border-[#E8E4DF] dark:border-slate-800">
                  <td className="py-3 px-2 font-medium text-[#1B2733] dark:text-white">
                    {cohort.cohort}
                  </td>
                  <td className="py-3 px-2 text-center text-[#5A6B7A] dark:text-slate-400">
                    {cohort.totalUsers}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getRetentionColor(cohort.d1Retention)}`}>
                      {cohort.d1Retention}%
                      {getTrendIndicator(cohort.d1Retention, prevCohort?.d1Retention ?? null)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getRetentionColor(cohort.d7Retention)}`}>
                      {cohort.d7Retention}%
                      {getTrendIndicator(cohort.d7Retention, prevCohort?.d7Retention ?? null)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getRetentionColor(cohort.d14Retention)}`}>
                      {cohort.d14Retention}%
                      {getTrendIndicator(cohort.d14Retention, prevCohort?.d14Retention ?? null)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getRetentionColor(cohort.d30Retention)}`}>
                      {cohort.d30Retention}%
                      {getTrendIndicator(cohort.d30Retention, prevCohort?.d30Retention ?? null)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3 sm:gap-4 text-xs text-[#5A6B7A] dark:text-slate-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
          <span>&gt;60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30" />
          <span>40-60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/30" />
          <span>20-40%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
          <span>&lt;20%</span>
        </div>
      </div>
    </Card>
  );
}

export default CohortAnalysis;
