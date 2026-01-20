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
  Download
} from 'lucide-react';

interface AnalyticsDashboardProps {
  onBack: () => void;
  userTier?: string;
}

interface AnalyticsData {
  totalSessions: number;
  activeUsers: number;
  avgSessionTime: string;
  completionRate: number;
  aiInteractions: number;
  goalsCompleted: number;
}

export function EnhancedAnalyticsDashboard({ onBack, userTier }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<AnalyticsData>({
    totalSessions: 0,
    activeUsers: 0,
    avgSessionTime: '0m',
    completionRate: 0,
    aiInteractions: 0,
    goalsCompleted: 0
  });

  useEffect(() => {
    // Load analytics data
    loadAnalytics();
  }, [timeRange]);

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
    <div className="min-h-screen bg-white">
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
        <div className="flex items-center gap-2 mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <Card key={idx} className="p-6">
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="ai">AI Usage</TabsTrigger>
            <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-6">
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

          <TabsContent value="engagement" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-slate-900 mb-4">Feature Usage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Ask Aminy (AI Chat)</span>
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

          <TabsContent value="ai" className="space-y-4">
            <Card className="p-6">
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

            <Card className="p-6">
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

          <TabsContent value="outcomes" className="space-y-4">
            <Card className="p-6">
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
        </Tabs>
      </div>
    </div>
  );
}
