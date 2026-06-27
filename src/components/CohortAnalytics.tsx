// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Cohort Analytics Dashboard
 *
 * Tracks user cohorts for:
 * - Retention analysis (D1, D7, D30, D90)
 * - Conversion funnel analysis
 * - Feature adoption by cohort
 * - Revenue per cohort
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  BarChart3,
  LineChart,
  ArrowRight,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { supabase } from '../utils/supabase/client';
import { isDemoMode } from '../lib/demo-seed';

interface CohortData {
  cohortWeek: string; // e.g., "2024-W01"
  signups: number;
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  d90Retention: number;
  conversionRate: number;
  avgRevenue: number;
  ltv: number;
}

interface ConversionFunnel {
  stage: string;
  count: number;
  rate: number;
}

interface FeatureAdoption {
  feature: string;
  adoptionRate: number;
  avgUsagePerUser: number;
  correlationWithRetention: number;
}

interface CohortAnalyticsProps {
  organizationId?: string;
}

export function CohortAnalytics({ organizationId }: CohortAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [funnelData, setFunnelData] = useState<ConversionFunnel[]>([]);
  const [featureData, setFeatureData] = useState<FeatureAdoption[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('retention');

  useEffect(() => {
    loadAnalytics();
  }, [organizationId]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // In production, these would be real Supabase queries. Until that path is
      // wired, real users must NOT see fabricated cohort/funnel/feature numbers
      // (they re-randomize on refresh). Only demo mode renders sample data.
      if (!isDemoMode()) {
        setCohortData([]);
        setFunnelData([]);
        setFeatureData([]);
        return;
      }

      // Simulate loading (demo only)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate cohort data for last 12 weeks
      const cohorts: CohortData[] = [];
      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekNum = getWeekNumber(weekDate);
        const year = weekDate.getFullYear();

        // Simulate improving metrics over time
        const improvement = (12 - i) * 0.02;

        cohorts.push({
          cohortWeek: `${year}-W${String(weekNum).padStart(2, '0')}`,
          signups: Math.round(80 + Math.random() * 40 + i * 5),
          d1Retention: Math.round((65 + improvement * 100 + Math.random() * 10) * 10) / 10,
          d7Retention: Math.round((45 + improvement * 80 + Math.random() * 8) * 10) / 10,
          d30Retention: Math.round((32 + improvement * 60 + Math.random() * 6) * 10) / 10,
          d90Retention: i < 4 ? 0 : Math.round((25 + improvement * 40 + Math.random() * 5) * 10) / 10,
          conversionRate: Math.round((8 + improvement * 50 + Math.random() * 3) * 10) / 10,
          avgRevenue: Math.round((12 + improvement * 30 + Math.random() * 5) * 100) / 100,
          ltv: Math.round((85 + improvement * 100 + Math.random() * 20) * 100) / 100,
        });
      }

      setCohortData(cohorts);

      // Conversion funnel data
      setFunnelData([
        { stage: 'Visited Landing', count: 15420, rate: 100 },
        { stage: 'Started Signup', count: 4872, rate: 31.6 },
        { stage: 'Completed Onboarding', count: 3245, rate: 66.6 },
        { stage: 'First AI Chat', count: 2891, rate: 89.1 },
        { stage: 'Day 1 Return', count: 2024, rate: 70.0 },
        { stage: 'Day 7 Active', count: 1459, rate: 72.1 },
        { stage: 'Subscribed', count: 312, rate: 21.4 },
      ]);

      // Feature adoption data
      setFeatureData([
        { feature: 'AI Chat', adoptionRate: 94, avgUsagePerUser: 12.3, correlationWithRetention: 0.82 },
        { feature: 'Morning Mission', adoptionRate: 67, avgUsagePerUser: 4.2, correlationWithRetention: 0.91 },
        { feature: 'Care Plan', adoptionRate: 45, avgUsagePerUser: 2.1, correlationWithRetention: 0.78 },
        { feature: 'Routine Tracking', adoptionRate: 52, avgUsagePerUser: 6.8, correlationWithRetention: 0.85 },
        { feature: 'Community', adoptionRate: 31, avgUsagePerUser: 3.4, correlationWithRetention: 0.65 },
        { feature: 'Document Vault', adoptionRate: 23, avgUsagePerUser: 1.5, correlationWithRetention: 0.72 },
        { feature: 'Telehealth', adoptionRate: 12, avgUsagePerUser: 0.8, correlationWithRetention: 0.88 },
      ]);

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const summaryMetrics = useMemo(() => {
    if (cohortData.length === 0) return null;

    const recent = cohortData.slice(-4);
    const previous = cohortData.slice(-8, -4);

    const avgRetentionRecent = recent.reduce((sum, c) => sum + c.d7Retention, 0) / recent.length;
    const avgRetentionPrevious = previous.reduce((sum, c) => sum + c.d7Retention, 0) / previous.length;

    const avgConversionRecent = recent.reduce((sum, c) => sum + c.conversionRate, 0) / recent.length;
    const avgConversionPrevious = previous.reduce((sum, c) => sum + c.conversionRate, 0) / previous.length;

    const totalSignupsRecent = recent.reduce((sum, c) => sum + c.signups, 0);
    const totalSignupsPrevious = previous.reduce((sum, c) => sum + c.signups, 0);

    const avgLTVRecent = recent.reduce((sum, c) => sum + c.ltv, 0) / recent.length;
    const avgLTVPrevious = previous.reduce((sum, c) => sum + c.ltv, 0) / previous.length;

    return {
      d7Retention: {
        value: avgRetentionRecent,
        change: avgRetentionRecent - avgRetentionPrevious,
        positive: avgRetentionRecent > avgRetentionPrevious,
      },
      conversion: {
        value: avgConversionRecent,
        change: avgConversionRecent - avgConversionPrevious,
        positive: avgConversionRecent > avgConversionPrevious,
      },
      signups: {
        value: totalSignupsRecent,
        change: ((totalSignupsRecent - totalSignupsPrevious) / totalSignupsPrevious) * 100,
        positive: totalSignupsRecent > totalSignupsPrevious,
      },
      ltv: {
        value: avgLTVRecent,
        change: ((avgLTVRecent - avgLTVPrevious) / avgLTVPrevious) * 100,
        positive: avgLTVRecent > avgLTVPrevious,
      },
    };
  }, [cohortData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#6B9080]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#132F43] dark:text-white">
            Cohort Analytics
          </h2>
          <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
            Track retention, conversion, and revenue by signup cohort
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="D7 Retention"
            value={`${summaryMetrics.d7Retention.value.toFixed(1)}%`}
            change={summaryMetrics.d7Retention.change}
            positive={summaryMetrics.d7Retention.positive}
            icon={Users}
          />
          <SummaryCard
            label="Conversion Rate"
            value={`${summaryMetrics.conversion.value.toFixed(1)}%`}
            change={summaryMetrics.conversion.change}
            positive={summaryMetrics.conversion.positive}
            icon={Target}
          />
          <SummaryCard
            label="Recent Signups"
            value={summaryMetrics.signups.value.toLocaleString()}
            change={summaryMetrics.signups.change}
            positive={summaryMetrics.signups.positive}
            icon={TrendingUp}
          />
          <SummaryCard
            label="Avg LTV"
            value={`$${summaryMetrics.ltv.value.toFixed(0)}`}
            change={summaryMetrics.ltv.change}
            positive={summaryMetrics.ltv.positive}
            icon={DollarSign}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="retention">Retention Matrix</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="features">Feature Adoption</TabsTrigger>
        </TabsList>

        {/* Retention Matrix */}
        <TabsContent value="retention">
          <Card className="p-6 overflow-x-auto">
            <h3 className="font-semibold text-[#132F43] dark:text-white mb-4">
              Retention by Cohort
            </h3>
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                  <th className="pb-3 pr-4 font-medium">Cohort</th>
                  <th className="pb-3 px-4 font-medium text-center">Signups</th>
                  <th className="pb-3 px-4 font-medium text-center">D1</th>
                  <th className="pb-3 px-4 font-medium text-center">D7</th>
                  <th className="pb-3 px-4 font-medium text-center">D30</th>
                  <th className="pb-3 px-4 font-medium text-center">D90</th>
                  <th className="pb-3 px-4 font-medium text-center">Conv %</th>
                  <th className="pb-3 pl-4 font-medium text-right">LTV</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {cohortData.map((cohort, idx) => (
                  <tr
                    key={cohort.cohortWeek}
                    className={`border-t border-[#E8E4DF] dark:border-slate-700 ${
                      selectedCohort === cohort.cohortWeek
                        ? 'bg-[#6B9080]/10 dark:bg-[#6B9080]/10'
                        : ''
                    }`}
                    onClick={() => setSelectedCohort(
                      selectedCohort === cohort.cohortWeek ? null : cohort.cohortWeek
                    )}
                  >
                    <td className="py-3 pr-4 font-medium text-[#132F43] dark:text-white cursor-pointer">
                      {cohort.cohortWeek}
                    </td>
                    <td className="py-3 px-4 text-center text-[#5A6B7A] dark:text-[#8A9BA8]">
                      {cohort.signups}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RetentionCell value={cohort.d1Retention} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RetentionCell value={cohort.d7Retention} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RetentionCell value={cohort.d30Retention} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {cohort.d90Retention > 0 ? (
                        <RetentionCell value={cohort.d90Retention} />
                      ) : (
                        <span className="text-[#8A9BA8] dark:text-[#5A6B7A]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${
                        cohort.conversionRate >= 10 ? 'text-green-600' :
                        cohort.conversionRate >= 5 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {cohort.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right font-medium text-[#132F43] dark:text-white">
                      ${cohort.ltv.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* Conversion Funnel */}
        <TabsContent value="funnel">
          <Card className="p-6">
            <h3 className="font-semibold text-[#132F43] dark:text-white mb-6">
              Signup to Subscription Funnel
            </h3>
            <div className="space-y-4">
              {funnelData.map((stage, idx) => (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#6B9080]/10 dark:bg-[#1a3a5c] text-[#6B9080] dark:text-[#7BA7BC] text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-[#132F43] dark:text-white">
                        {stage.stage}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-[#132F43] dark:text-white">
                        {stage.count.toLocaleString()}
                      </span>
                      {idx > 0 && (
                        <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] ml-2">
                          ({stage.rate}% of prev)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-8 bg-[#EDF4F7] dark:bg-slate-700 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stage.count / funnelData[0].count) * 100}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-lg"
                    />
                  </div>
                  {idx < funnelData.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowRight className="w-4 h-4 text-[#8A9BA8] dark:text-[#5A6B7A] transform rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">
                Key Insights
              </h4>
              <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                <li>• 66.6% complete onboarding — good but room for improvement</li>
                <li>• 89.1% who complete onboarding have first AI chat — strong activation</li>
                <li>• 21.4% of D7 active users convert — focus on value demonstration</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        {/* Feature Adoption */}
        <TabsContent value="features">
          <Card className="p-6">
            <h3 className="font-semibold text-[#132F43] dark:text-white mb-6">
              Feature Adoption & Retention Correlation
            </h3>
            <div className="space-y-6">
              {featureData
                .sort((a, b) => b.correlationWithRetention - a.correlationWithRetention)
                .map((feature) => (
                  <div key={feature.feature}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[#132F43] dark:text-white">
                        {feature.feature}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                          {feature.avgUsagePerUser.toFixed(1)} uses/user
                        </span>
                        <Badge
                          variant="outline"
                          className={`${
                            feature.correlationWithRetention >= 0.85
                              ? 'border-green-500 text-green-700 bg-green-50'
                              : feature.correlationWithRetention >= 0.7
                              ? 'border-yellow-500 text-yellow-700 bg-[#FDF9F0]'
                              : 'border-[#E8E4DF] text-[#5A6B7A]'
                          }`}
                        >
                          r={feature.correlationWithRetention.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-3 bg-[#EDF4F7] dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${feature.adoptionRate}%` }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-sm font-medium text-[#3A4A57] dark:text-gray-300 w-12 text-right">
                        {feature.adoptionRate}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-[#6B9080]/10 dark:bg-[#6B9080]/10 rounded-lg">
              <h4 className="font-medium text-[#6B9080] dark:text-[#7BA7BC] mb-2">
                Retention Drivers
              </h4>
              <ul className="text-sm text-[#6B9080] dark:text-primary space-y-1">
                <li>• <strong>Morning Mission</strong> has highest retention correlation (r=0.91)</li>
                <li>• <strong>Telehealth</strong> users retain exceptionally well (r=0.88)</li>
                <li>• Focus on increasing Routine Tracking adoption (52% → 70% target)</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  change,
  positive,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: number;
  positive: boolean;
  icon: React.ElementType;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="p-2 bg-[#6B9080]/10 dark:bg-[#6B9080]/15 rounded-lg">
          <Icon className="w-5 h-5 text-[#6B9080]" />
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          positive ? 'text-green-600' : 'text-red-600'
        }`}>
          {positive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <p className="text-2xl font-bold text-[#132F43] dark:text-white mt-3">
        {value}
      </p>
      <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">{label}</p>
    </Card>
  );
}

function RetentionCell({ value }: { value: number }) {
  const getColor = () => {
    if (value >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (value >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (value >= 30) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}>
      {value}%
    </span>
  );
}

export default CohortAnalytics;
