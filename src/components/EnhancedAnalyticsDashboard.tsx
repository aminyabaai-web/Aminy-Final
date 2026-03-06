import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  MessageSquare,
  Clock,
  Target,
  Sparkles,
  BarChart3,
  Activity,
  Calendar,
  Download,
  Filter,
  ChevronDown,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import {
  getConversionFunnel,
  getRetentionMetrics,
  generateMockFunnelData,
  generateMockRetentionData,
  type ConversionFunnel,
  type RetentionMetrics,
  type FunnelStage,
  type RetentionCohort
} from '../lib/analytics-engine';

interface AnalyticsDashboardProps {
  onBack: () => void;
  userTier?: string;
  userRole?: 'user' | 'admin' | 'investor';
}

interface AnalyticsData {
  totalSessions: number;
  activeUsers: number;
  avgSessionTime: string;
  completionRate: number;
  aiInteractions: number;
  goalsCompleted: number;
}

// Admin emails for access control
const ADMIN_EMAILS = [
  'admin@aminy.ai',
  'founder@aminy.ai',
  'aminyaba.ai@gmail.com',
];

// Helper functions
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function formatCohortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRetentionColor(value: number): string {
  if (value >= 60) return 'text-green-600 font-medium';
  if (value >= 40) return 'text-green-500';
  if (value >= 25) return 'text-yellow-600';
  if (value >= 15) return 'text-orange-500';
  return 'text-red-500';
}

export function EnhancedAnalyticsDashboard({ onBack, userTier, userRole = 'user' }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [funnelData, setFunnelData] = useState<ConversionFunnel | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionMetrics | null>(null);
  const [isLoadingFunnel, setIsLoadingFunnel] = useState(false);
  const [useMockData, setUseMockData] = useState(true); // Use mock data for demo
  const [data, setData] = useState<AnalyticsData>({
    totalSessions: 0,
    activeUsers: 0,
    avgSessionTime: '0m',
    completionRate: 0,
    aiInteractions: 0,
    goalsCompleted: 0
  });

  // Check if user has admin/investor access
  const hasAdvancedAccess = userRole === 'admin' || userRole === 'investor' || userTier === 'pro+';

  useEffect(() => {
    // Load analytics data
    loadAnalytics();
  }, [timeRange]);

  useEffect(() => {
    // Load funnel and retention data when switching to those tabs
    if (activeTab === 'funnel' || activeTab === 'retention') {
      loadFunnelAndRetention();
    }
  }, [activeTab, timeRange]);

  const loadAnalytics = () => {
    // Mock data - in production, this would come from backend
    setData({
      totalSessions: 1247,
      activeUsers: 423,
      avgSessionTime: '8m 34s',
      completionRate: 76,
      aiInteractions: 3891,
      goalsCompleted: 189
    });
  };

  const loadFunnelAndRetention = () => {
    setIsLoadingFunnel(true);
    try {
      if (useMockData) {
        // Use mock data for demo purposes
        setFunnelData(generateMockFunnelData());
        setRetentionData(generateMockRetentionData());
      } else {
        // Use real data from localStorage
        const dateRange = {
          start: new Date(Date.now() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000),
          end: new Date()
        };
        setFunnelData(getConversionFunnel(dateRange));
        setRetentionData(getRetentionMetrics());
      }
    } catch (error) {
      console.error('Failed to load funnel data:', error);
    } finally {
      setIsLoadingFunnel(false);
    }
  };

  const metrics = [
    {
      label: 'Total Sessions',
      value: data.totalSessions.toLocaleString(),
      change: '+12%',
      trend: 'up' as const,
      icon: Activity
    },
    {
      label: 'Active Users',
      value: data.activeUsers.toLocaleString(),
      change: '+8%',
      trend: 'up' as const,
      icon: Users
    },
    {
      label: 'Avg Session Time',
      value: data.avgSessionTime,
      change: '+2%',
      trend: 'up' as const,
      icon: Clock
    },
    {
      label: 'Completion Rate',
      value: `${data.completionRate}%`,
      change: '-3%',
      trend: 'down' as const,
      icon: Target
    },
    {
      label: 'AI Interactions',
      value: data.aiInteractions.toLocaleString(),
      change: '+15%',
      trend: 'up' as const,
      icon: Sparkles
    },
    {
      label: 'Goals Completed',
      value: data.goalsCompleted.toLocaleString(),
      change: '+10%',
      trend: 'up' as const,
      icon: Target
    }
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/5 via-accent/8 to-accent/5 border-b border-accent/10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-slate-900 mb-2">Analytics Dashboard</h1>
              <p className="text-slate-600">Track engagement, usage, and outcomes</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Time Range Selector */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <span className="text-sm text-slate-600 mr-2">Time Range:</span>
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
            className={timeRange === '7d' ? 'bg-accent' : ''}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
            className={timeRange === '30d' ? 'bg-accent' : ''}
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
            className={timeRange === '90d' ? 'bg-accent' : ''}
          >
            90 Days
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <Card key={idx} className="p-4 sm:p-5 md:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm ${getTrendColor(metric.trend)}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className="text-2xl text-slate-900 mb-1">{metric.value}</div>
                <div className="text-sm text-slate-600">{metric.label}</div>
              </Card>
            );
          })}
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <TabsList className={`grid w-full mb-4 sm:mb-6 ${hasAdvancedAccess ? 'grid-cols-6' : 'grid-cols-4'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            {hasAdvancedAccess && (
              <>
                <TabsTrigger value="funnel">
                  <Filter className="w-3 h-3 mr-1" />
                  Funnel
                </TabsTrigger>
                <TabsTrigger value="retention">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retention
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="ai">AI Usage</TabsTrigger>
            <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 sm:space-y-4">
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                Usage Overview
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Peak usage time</span>
                  <span className="text-sm text-slate-900">7-9 AM, 8-10 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Most active day</span>
                  <span className="text-sm text-slate-900">Monday</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Avg sessions per user</span>
                  <span className="text-sm text-slate-900">2.9</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Retention rate (7d)</span>
                  <span className="text-sm text-slate-900">68%</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-3 sm:space-y-4">
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="text-slate-900 mb-4">Feature Usage</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Aminy (AI Chat)</span>
                    <span className="text-slate-900">92%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Care Plan</span>
                    <span className="text-slate-900">85%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Goal Tracking</span>
                    <span className="text-slate-900">78%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: '78%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Junior Mode</span>
                    <span className="text-slate-900">64%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: '64%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Reports</span>
                    <span className="text-slate-900">45%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-3 sm:space-y-4">
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                AI Interaction Insights
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total AI messages</span>
                  <span className="text-sm text-slate-900">3,891</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Avg conversation length</span>
                  <span className="text-sm text-slate-900">5.2 messages</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Positive feedback rate</span>
                  <span className="text-sm text-slate-900">94%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Response time (avg)</span>
                  <span className="text-sm text-slate-900">1.8s</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h4 className="text-slate-900 mb-3">Top AI Queries</h4>
              <div className="space-y-2">
                {[
                  'Morning routine help',
                  'Bedtime transitions',
                  'Managing meltdowns',
                  'Communication strategies',
                  'Social skills support'
                ].map((query, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{query}</span>
                    <Badge variant="outline">{Math.floor(Math.random() * 200 + 100)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="outcomes" className="space-y-3 sm:space-y-4">
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="text-slate-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Goal & Progress Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total goals set</span>
                  <span className="text-sm text-slate-900">834</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Goals completed</span>
                  <span className="text-sm text-slate-900">189 (23%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Avg progress rate</span>
                  <span className="text-sm text-slate-900">+12% weekly</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Parent satisfaction</span>
                  <span className="text-sm text-slate-900">4.8/5.0</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-green-50 border-green-200">
              <h4 className="text-slate-900 mb-3">Success Stories</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600">✓</span>
                  </div>
                  <p className="text-slate-700">
                    78% of families report improved morning routines within 2 weeks
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600">✓</span>
                  </div>
                  <p className="text-slate-700">
                    85% of parents feel more confident in managing challenging behaviors
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600">✓</span>
                  </div>
                  <p className="text-slate-700">
                    Average goal progress increased by 34% with consistent AI coaching
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Conversion Funnel Tab - Admin/Investor Only */}
          {hasAdvancedAccess && (
            <TabsContent value="funnel" className="space-y-3 sm:space-y-4">
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <h3 className="text-slate-900 flex items-center gap-2">
                      <Filter className="w-5 h-5 text-accent" />
                      Conversion Funnel
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">User journey from app open to subscription</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={useMockData}
                        onChange={(e) => {
                          setUseMockData(e.target.checked);
                          loadFunnelAndRetention();
                        }}
                        className="rounded"
                      />
                      Demo Mode
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadFunnelAndRetention}
                      disabled={isLoadingFunnel}
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingFunnel ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>

                {isLoadingFunnel ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : funnelData ? (
                  <div className="space-y-3 sm:space-y-4 sm:space-y-6">
                    {/* Funnel Visualization */}
                    <div className="relative">
                      {funnelData.stages.map((stage, idx) => {
                        const widthPercent = stage.conversionRate;
                        const isLastStage = idx === funnelData.stages.length - 1;
                        const dropOffCritical = stage.dropOffRate > 50;

                        return (
                          <div key={stage.id} className="mb-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-700 font-medium">{stage.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-600">{stage.count.toLocaleString()} users</span>
                                <Badge
                                  variant={widthPercent >= 50 ? 'default' : 'outline'}
                                  className={widthPercent >= 50 ? 'bg-green-100 text-green-800' : ''}
                                >
                                  {stage.conversionRate.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden">
                              <div
                                className={`h-8 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${
                                  idx === 0 ? 'bg-accent' :
                                  idx === funnelData.stages.length - 1 ? 'bg-green-500' :
                                  'bg-accent/80'
                                }`}
                                style={{ width: `${Math.max(widthPercent, 5)}%` }}
                              >
                                {widthPercent > 15 && (
                                  <span className="text-xs text-white font-medium">
                                    {stage.conversionRate.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            {!isLastStage && stage.dropOffRate > 0 && (
                              <div className="flex items-center justify-between mt-1 text-xs">
                                <span className={`${dropOffCritical ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                  {dropOffCritical && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                  {stage.dropOffRate.toFixed(1)}% drop-off
                                </span>
                                {stage.avgTimeToNext && (
                                  <span className="text-slate-400">
                                    Avg time to next: {formatDuration(stage.avgTimeToNext)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-slate-200">
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900">
                          {funnelData.totalUsers.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">Total Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                          {funnelData.overallConversionRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">Overall Conversion</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900">
                          {funnelData.stages[funnelData.stages.length - 1]?.count || 0}
                        </div>
                        <div className="text-xs text-slate-500">Subscribers</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    No funnel data available
                  </div>
                )}
              </Card>

              {/* Drop-off Analysis */}
              {funnelData && (
                <Card className="p-4 sm:p-5 md:p-6">
                  <h4 className="text-slate-900 font-medium mb-4">Drop-off Analysis</h4>
                  <div className="space-y-3">
                    {funnelData.stages
                      .filter(s => s.dropOffRate > 20)
                      .sort((a, b) => b.dropOffRate - a.dropOffRate)
                      .map(stage => (
                        <div key={stage.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-red-900">{stage.name}</span>
                            <p className="text-xs text-red-700 mt-1">
                              {stage.dropOffRate > 50
                                ? 'Critical bottleneck - requires immediate attention'
                                : stage.dropOffRate > 30
                                ? 'High drop-off - consider optimization'
                                : 'Moderate drop-off - monitor trends'}
                            </p>
                          </div>
                          <Badge className="bg-red-100 text-red-800">
                            {stage.dropOffRate.toFixed(1)}% drop-off
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Retention Tab - Admin/Investor Only */}
          {hasAdvancedAccess && retentionData && (
            <TabsContent value="retention" className="space-y-3 sm:space-y-4">
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <h3 className="text-slate-900 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-accent" />
                      Retention Metrics
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">User retention by cohort</p>
                  </div>
                </div>

                {retentionData ? (
                  <div className="space-y-3 sm:space-y-4 sm:space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      <Card className="p-4 bg-slate-50">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900">
                          {retentionData.averageD1.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">D1 Retention</div>
                      </Card>
                      <Card className="p-4 bg-slate-50">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900">
                          {retentionData.averageD7.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">D7 Retention</div>
                      </Card>
                      <Card className="p-4 bg-slate-50">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900">
                          {retentionData.averageD30.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">D30 Retention</div>
                      </Card>
                      <Card className="p-4 bg-red-50">
                        <div className="text-xl sm:text-2xl font-bold text-red-600">
                          {retentionData.churnRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">Monthly Churn</div>
                      </Card>
                    </div>

                    {/* Active Users */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      <Card className="p-4 border-l-4 border-l-green-500">
                        <div className="text-xl font-bold text-slate-900">
                          {retentionData.rollingActiveUsers.daily.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">Daily Active Users (DAU)</div>
                      </Card>
                      <Card className="p-4 border-l-4 border-l-blue-500">
                        <div className="text-xl font-bold text-slate-900">
                          {retentionData.rollingActiveUsers.weekly.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">Weekly Active Users (WAU)</div>
                      </Card>
                      <Card className="p-4 border-l-4 border-l-purple-500">
                        <div className="text-xl font-bold text-slate-900">
                          {retentionData.rollingActiveUsers.monthly.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">Monthly Active Users (MAU)</div>
                      </Card>
                    </div>

                    {/* Cohort Table */}
                    <div>
                      <h4 className="text-slate-900 font-medium mb-3">Cohort Retention Table</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 pr-4 text-slate-500 font-medium">Cohort</th>
                              <th className="text-center py-2 px-2 text-slate-500 font-medium">Size</th>
                              <th className="text-center py-2 px-2 text-slate-500 font-medium">D1</th>
                              <th className="text-center py-2 px-2 text-slate-500 font-medium">D7</th>
                              <th className="text-center py-2 px-2 text-slate-500 font-medium">D14</th>
                              <th className="text-center py-2 px-2 text-slate-500 font-medium">D30</th>
                              <th className="text-center py-2 px-2 text-slate-500 font-medium">D60</th>
                              <th className="text-center py-2 px-2 text-slate-500 font-medium">D90</th>
                            </tr>
                          </thead>
                          <tbody>
                            {retentionData.cohorts.map((cohort, idx) => (
                              <tr key={cohort.cohortDate} className="border-b border-slate-100">
                                <td className="py-2 pr-4 text-slate-900">{formatCohortDate(cohort.cohortDate)}</td>
                                <td className="text-center py-2 px-2 text-slate-600">{cohort.cohortSize}</td>
                                <td className={`text-center py-2 px-2 ${getRetentionColor(cohort.d1)}`}>
                                  {cohort.d1.toFixed(0)}%
                                </td>
                                <td className={`text-center py-2 px-2 ${getRetentionColor(cohort.d7)}`}>
                                  {cohort.d7.toFixed(0)}%
                                </td>
                                <td className={`text-center py-2 px-2 ${getRetentionColor(cohort.d14)}`}>
                                  {cohort.d14.toFixed(0)}%
                                </td>
                                <td className={`text-center py-2 px-2 ${getRetentionColor(cohort.d30)}`}>
                                  {cohort.d30.toFixed(0)}%
                                </td>
                                <td className={`text-center py-2 px-2 ${getRetentionColor(cohort.d60)}`}>
                                  {cohort.d60.toFixed(0)}%
                                </td>
                                <td className={`text-center py-2 px-2 ${getRetentionColor(cohort.d90)}`}>
                                  {cohort.d90.toFixed(0)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Industry Benchmarks */}
                    <Card className="p-4 bg-blue-50 border-blue-200">
                      <h4 className="text-slate-900 font-medium mb-2">Industry Benchmarks</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">D1 (Industry):</span>
                          <span className="ml-2 font-medium">40-60%</span>
                        </div>
                        <div>
                          <span className="text-slate-600">D7 (Industry):</span>
                          <span className="ml-2 font-medium">20-35%</span>
                        </div>
                        <div>
                          <span className="text-slate-600">D30 (Industry):</span>
                          <span className="ml-2 font-medium">10-20%</span>
                        </div>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        Health & wellness apps typically see 25-40% D7 retention. Aminy's current metrics
                        {retentionData.averageD7 > 40 ? ' exceed' : retentionData.averageD7 > 25 ? ' meet' : ' are below'} industry benchmarks.
                      </p>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    No retention data available
                  </div>
                )}
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
