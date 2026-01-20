/**
 * Analytics Dashboard v1.0 - Production Intelligence Console
 * 
 * Comprehensive dashboard for viewing user analytics, performance metrics,
 * and behavioral insights to optimize the Aminy experience.
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Clock, 
  Zap, 
  Target, 
  Brain, 
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  Settings
} from 'lucide-react';
import { analytics, useAnalytics } from '../lib/analytics-engine';
import { performanceMonitor, usePerformanceMonitor } from '../lib/performance-monitor';
import { contextEngine, useContextEngine } from '../lib/context-engine';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsDashboard({ isOpen, onClose }: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  const { getInsights, exportData } = useAnalytics();
  const { getInsights: getPerformanceInsights, exportData: exportPerformanceData } = usePerformanceMonitor();
  const { getInsights: getContextInsights, exportData: exportContextData } = useContextEngine();

  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
    }
  }, [isOpen, lastRefresh]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Gather all analytics data
      const sessionInsights = getInsights();
      const analyticsData = exportData();
      const performanceData = exportPerformanceData();
      const contextData = exportContextData();
      
      // Process and aggregate data
      const processedData = {
        session: sessionInsights,
        analytics: analyticsData,
        performance: performanceData,
        context: contextData,
        summary: generateSummaryStats(analyticsData, performanceData, contextData),
        trends: calculateTrends(analyticsData.events),
        userJourney: analyzeUserJourney(analyticsData.events),
        featureEngagement: analyzeFeatureEngagement(analyticsData.events),
        errorAnalysis: analyzeErrors(analyticsData.events),
      };
      
      setDashboardData(processedData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummaryStats = (analytics: any, performance: any, context: any) => {
    const events = analytics.events || [];
    const session = analytics.session || {};
    
    // Calculate avg calm cue responses per user/week (NEW METRIC)
    const calmCueEvents = events.filter((e: any) => 
      e.event === 'ai_chat_message' || e.event === 'calm_cue_delivered'
    );
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    const sessionWeeks = (Date.now() - (session.startTime || Date.now())) / weekInMs;
    const avgCalmCuesPerWeek = sessionWeeks > 0 ? calmCueEvents.length / sessionWeeks : calmCueEvents.length;
    
    return {
      totalEvents: events.length,
      sessionDuration: Math.round((Date.now() - session.startTime) / 1000 / 60), // minutes
      featuresUsed: new Set(events.map((e: any) => extractFeature(e.event)).filter(Boolean)).size,
      contextRichness: context.insights?.contextRichness || 0,
      performanceScore: performance.insights?.performanceScore || 0,
      errorCount: events.filter((e: any) => e.event === 'error_occurred').length,
      conversionsCompleted: events.filter((e: any) => e.event === 'conversion_completed').length,
      avgResponseTime: calculateAvgResponseTime(events),
      avgCalmCuesPerWeek: Math.round(avgCalmCuesPerWeek * 10) / 10, // NEW METRIC
    };
  };

  const extractFeature = (eventName: string): string | null => {
    if (eventName.startsWith('ask_aminy_')) return 'Ask Aminy';
    if (eventName.startsWith('care_plan_')) return 'Care Planning';
    if (eventName.startsWith('junior_')) return 'Junior Mode';
    if (eventName.includes('report')) return 'Reports';
    if (eventName.includes('vault')) return 'Document Vault';
    return null;
  };

  const calculateAvgResponseTime = (events: any[]): number => {
    const responseEvents = events.filter(e => 
      e.properties?.responseTime && e.properties.responseTime < 10000
    );
    
    if (responseEvents.length === 0) return 0;
    
    const totalTime = responseEvents.reduce((sum, e) => sum + e.properties.responseTime, 0);
    return Math.round(totalTime / responseEvents.length);
  };

  const calculateTrends = (events: any[]) => {
    const last24Hours = Date.now() - 86400000;
    const recentEvents = events.filter(e => e.timestamp > last24Hours);
    
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
      const hourStart = Date.now() - (24 - hour) * 3600000;
      const hourEnd = hourStart + 3600000;
      const hourEvents = recentEvents.filter(e => 
        e.timestamp >= hourStart && e.timestamp < hourEnd
      );
      
      return {
        hour,
        events: hourEvents.length,
        features: new Set(hourEvents.map(e => extractFeature(e.event)).filter(Boolean)).size,
      };
    });
    
    return {
      hourlyActivity,
      mostActiveHour: hourlyActivity.reduce((max, curr) => 
        curr.events > max.events ? curr : max
      ),
      totalRecentEvents: recentEvents.length,
    };
  };

  const analyzeUserJourney = (events: any[]) => {
    const journeyEvents = events.filter(e => 
      ['page_viewed', 'feature_engaged', 'conversion_completed', 'onboarding_step_completed'].includes(e.event)
    );
    
    const journeyMap = journeyEvents.reduce((map, event) => {
      const step = event.properties?.page || event.properties?.feature || event.event;
      map[step] = (map[step] || 0) + 1;
      return map;
    }, {});
    
    return {
      totalSteps: journeyEvents.length,
      uniqueSteps: Object.keys(journeyMap).length,
      mostVisitedStep: Object.entries(journeyMap).reduce((max: any, [step, count]: any) => 
        count > max.count ? { step, count } : max, { step: '', count: 0 }
      ),
      journeyMap,
    };
  };

  const analyzeFeatureEngagement = (events: any[]) => {
    const featureEvents = events.filter(e => e.event === 'feature_engaged');
    const engagement = featureEvents.reduce((acc, event) => {
      const feature = event.properties?.feature;
      if (feature) {
        acc[feature] = {
          uses: (acc[feature]?.uses || 0) + 1,
          avgDuration: event.properties?.duration || 0,
          lastUsed: event.timestamp,
        };
      }
      return acc;
    }, {});
    
    return Object.entries(engagement)
      .map(([feature, data]: any) => ({ feature, ...data }))
      .sort((a, b) => b.uses - a.uses);
  };

  const analyzeErrors = (events: any[]) => {
    const errors = events.filter(e => e.event === 'error_occurred');
    const errorTypes = errors.reduce((acc, error) => {
      const type = error.properties?.errorName || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalErrors: errors.length,
      errorTypes,
      recentErrors: errors.slice(-5),
      errorRate: errors.length / events.length,
    };
  };

  const handleRefresh = () => {
    setLastRefresh(Date.now());
  };

  const handleExportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      dashboard: dashboardData,
      rawAnalytics: exportData(),
      rawPerformance: exportPerformanceData(),
      rawContext: exportContextData(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aminy-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Analytics Dashboard
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time insights and performance metrics
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading analytics data...</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5 mx-6 mt-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="user-journey">User Journey</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="context">AI Context</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Total Events</p>
                          <p className="text-2xl font-bold">{dashboardData.summary?.totalEvents || 0}</p>
                        </div>
                        <Activity className="w-8 h-8 text-blue-500" />
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Session Duration</p>
                          <p className="text-2xl font-bold">{dashboardData.summary?.sessionDuration || 0}m</p>
                        </div>
                        <Clock className="w-8 h-8 text-green-500" />
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Features Used</p>
                          <p className="text-2xl font-bold">{dashboardData.summary?.featuresUsed || 0}</p>
                        </div>
                        <Target className="w-8 h-8 text-purple-500" />
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Context Score</p>
                          <p className="text-2xl font-bold">{dashboardData.summary?.contextRichness || 0}%</p>
                        </div>
                        <Brain className="w-8 h-8 text-orange-500" />
                      </div>
                    </Card>
                  </div>

                  {/* NEW METRIC: Calm Cue Engagement */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Calm Cue Engagement</h3>
                        <p className="text-sm text-gray-500">Average responses per user / week</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-cyan-600">
                          {dashboardData.summary?.avgCalmCuesPerWeek || 0}
                        </p>
                        <p className="text-xs text-gray-500">cues/week</p>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400"
                        style={{ width: `${Math.min(100, (dashboardData.summary?.avgCalmCuesPerWeek || 0) * 10)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Target: 10+ cues/week for optimal engagement
                    </p>
                  </Card>

                  {/* Trends Chart */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Activity Trends (24h)</h3>
                    <div className="h-64 flex items-end space-x-2">
                      {dashboardData.trends?.hourlyActivity?.map((hour: any, index: number) => (
                        <div
                          key={index}
                          className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-t"
                          style={{
                            height: `${Math.max(4, (hour.events / Math.max(...dashboardData.trends.hourlyActivity.map((h: any) => h.events))) * 100)}%`
                          }}
                          title={`Hour ${hour.hour}: ${hour.events} events`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>24h ago</span>
                      <span>Now</span>
                    </div>
                  </Card>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Performance Score</p>
                          <p className="text-2xl font-bold">{dashboardData.summary?.performanceScore || 0}</p>
                          <Badge className={
                            (dashboardData.summary?.performanceScore || 0) > 80 
                              ? "bg-green-100 text-green-800" 
                              : (dashboardData.summary?.performanceScore || 0) > 60 
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }>
                            {(dashboardData.summary?.performanceScore || 0) > 80 ? 'Good' : 
                             (dashboardData.summary?.performanceScore || 0) > 60 ? 'Fair' : 'Poor'}
                          </Badge>
                        </div>
                        <Zap className="w-8 h-8 text-yellow-500" />
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Avg Response Time</p>
                          <p className="text-2xl font-bold">{dashboardData.summary?.avgResponseTime || 0}ms</p>
                        </div>
                        <Activity className="w-8 h-8 text-blue-500" />
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Error Count</p>
                          <p className="text-2xl font-bold">{dashboardData.summary?.errorCount || 0}</p>
                          <Badge className={
                            (dashboardData.summary?.errorCount || 0) === 0 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }>
                            {(dashboardData.summary?.errorCount || 0) === 0 ? 'Clean' : 'Issues'}
                          </Badge>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                    </Card>
                  </div>

                  {/* Core Web Vitals */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Core Web Vitals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(dashboardData.performance?.coreWebVitals || {}).map(([metric, value]: any) => (
                        metric !== 'ratings' && (
                          <div key={metric} className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-gray-500 uppercase">{metric}</p>
                            <p className="text-xl font-bold">{Math.round(value)}ms</p>
                            <Badge className={
                              dashboardData.performance?.coreWebVitals?.ratings?.[metric] === 'good'
                                ? "bg-green-100 text-green-800"
                                : dashboardData.performance?.coreWebVitals?.ratings?.[metric] === 'needs-improvement'
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }>
                              {dashboardData.performance?.coreWebVitals?.ratings?.[metric] || 'unknown'}
                            </Badge>
                          </div>
                        )
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* User Journey Tab */}
                <TabsContent value="user-journey" className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">User Journey Flow</h3>
                    <div className="space-y-4">
                      {Object.entries(dashboardData.userJourney?.journeyMap || {}).map(([step, count]: any) => (
                        <div key={step} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{step}</span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2 bg-blue-500 rounded"
                              style={{ 
                                width: `${Math.max(20, (count / Math.max(...Object.values(dashboardData.userJourney?.journeyMap || {}))) * 200)}px` 
                              }}
                            />
                            <span className="text-sm text-gray-500">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* Features Tab */}
                <TabsContent value="features" className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Feature Engagement</h3>
                    <div className="space-y-4">
                      {dashboardData.featureEngagement?.map((feature: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{feature.feature}</p>
                            <p className="text-sm text-gray-500">{feature.uses} uses</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              Last used: {new Date(feature.lastUsed).toLocaleTimeString()}
                            </p>
                            {feature.avgDuration > 0 && (
                              <p className="text-sm text-gray-500">
                                Avg: {Math.round(feature.avgDuration / 1000)}s
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* AI Context Tab */}
                <TabsContent value="context" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Context Richness</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Overall Score</span>
                          <Badge className="bg-blue-100 text-blue-800">
                            {dashboardData.context?.insights?.contextRichness || 0}%
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Missing Context:</p>
                          {dashboardData.context?.insights?.missingContext?.map((item: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                              <span className="text-sm">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Personalization Opportunities</h3>
                      <div className="space-y-2">
                        {dashboardData.context?.insights?.personalizationOpportunities?.map((opportunity: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">{opportunity}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;