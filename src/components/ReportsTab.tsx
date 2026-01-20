import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Target, 
  Brain, 
  Activity, 
  Clock, 
  Award, 
  Download, 
  Share2, 
  Filter, 
  Sparkles,
  ChevronRight,
  FileText,
  PieChart,
  LineChart,
  Users,
  School,
  Stethoscope,
  CheckCircle,
  AlertCircle,
  Star,
  Zap,
  Eye,
  ArrowUp,
  ArrowDown,
  Lock,
  Crown,
  Shield
} from 'lucide-react';
// Mock date functions for demo purposes
const format = (date: Date, formatStr: string) => date.toLocaleDateString();
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
const subWeeks = (date: Date, weeks: number) => subDays(date, weeks * 7);
const subMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() - months, date.getDate());

interface ReportsTabProps {
  userData?: {
    parentName?: string;
    childName?: string;
  };
  userTier: string;
  connectorData?: any;
  onPaywallTrigger?: () => void;
}

interface SnapshotMetric {
  id: string;
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: React.ReactNode;
}

interface ReportSummary {
  id: string;
  title: string;
  period: string;
  status: 'ready' | 'generating' | 'error';
  lastGenerated: Date;
  type: 'parent' | 'clinical' | 'teacher';
  insights: string[];
}

export function ReportsTab({ userData, userTier, connectorData, onPaywallTrigger }: ReportsTabProps) {
  // Safe defaults for userData
  const safeChildName = userData?.childName || 'your child';
  const safeParentName = userData?.parentName || 'Parent';
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [savedCoverageSummaries, setSavedCoverageSummaries] = useState<any[]>([]);

  // Load coverage summaries on mount
  useEffect(() => {
    const saved = localStorage.getItem('aminy-coverage-summaries');
    if (saved) {
      try {
        setSavedCoverageSummaries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load coverage summaries:', e);
      }
    }
  }, []);

  // Mock data - in real app, this would come from connectorData
  const snapshotMetrics: SnapshotMetric[] = [
    {
      id: 'skills',
      title: 'Skills Mastered',
      value: '3 this month',
      change: 15,
      trend: 'up',
      color: 'text-green-600',
      icon: <Target className="w-5 h-5 text-green-600" />
    },
    {
      id: 'behavior',
      title: 'Behavior Trends',
      value: '40% improvement',
      change: -25,
      trend: 'up',
      color: 'text-blue-600',
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />
    },
    {
      id: 'routines',
      title: 'Routine Success',
      value: '85% completion',
      change: 12,
      trend: 'up',
      color: 'text-purple-600',
      icon: <Clock className="w-5 h-5 text-purple-600" />
    },
    {
      id: 'reinforcement',
      title: 'Reinforcer Effectiveness',
      value: 'High engagement',
      change: 8,
      trend: 'stable',
      color: 'text-amber-600',
      icon: <Award className="w-5 h-5 text-amber-600" />
    }
  ];

  const recentReports: ReportSummary[] = [
    {
      id: '1',
      title: 'Weekly Parent Summary',
      period: 'Dec 9-15, 2024',
      status: 'ready',
      lastGenerated: new Date(),
      type: 'parent',
      insights: [
        `${safeChildName} gained 2 new communication skills`,
        'Bedtime routine success increased by 20%',
        'Morning transitions showed improvement'
      ]
    },
    {
      id: '2',
      title: 'Monthly Clinical Summary',
      period: 'November 2024',
      status: userTier === 'pro' ? 'ready' : 'generating',
      lastGenerated: subDays(new Date(), 3),
      type: 'clinical',
      insights: [
        'Significant progress in social communication',
        'Sensory regulation strategies showing effectiveness',
        'Recommend adjusting token system frequency'
      ]
    },
    {
      id: '3',
      title: 'Teacher Packet',
      period: 'Q4 2024',
      status: 'ready',
      lastGenerated: subWeeks(new Date(), 1),
      type: 'teacher',
      insights: [
        'School transition strategies updated',
        'Visual supports proving highly effective',
        'Peer interaction goals on track'
      ]
    }
  ];

  const skillsProgress = [
    { domain: 'Communication', current: 75, target: 85, color: 'bg-blue-500' },
    { domain: 'Social Skills', current: 60, target: 75, color: 'bg-green-500' },
    { domain: 'Self-Regulation', current: 80, target: 90, color: 'bg-purple-500' },
    { domain: 'Daily Living', current: 65, target: 80, color: 'bg-amber-500' }
  ];

  const behaviorData = [
    { trigger: 'Transitions', frequency: 3, trend: 'down', improvement: 40 },
    { trigger: 'Sensory Overload', frequency: 2, trend: 'down', improvement: 60 },
    { trigger: 'Schedule Changes', frequency: 1, trend: 'stable', improvement: 25 },
    { trigger: 'Peer Interactions', frequency: 1, trend: 'down', improvement: 75 }
  ];

  const handleExport = async (reportId: string, format: 'pdf' | 'csv') => {
    if (userTier === 'starter' && format === 'csv') {
      onPaywallTrigger?.();
      return;
    }

    setIsGenerating(true);
    // Simulate export generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    
    // In real app, would trigger actual download
  };

  const handleGenerateReport = async (type: string) => {
    if (userTier === 'starter' && type === 'clinical') {
      onPaywallTrigger?.();
      return;
    }

    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
  };

  const getTierBadge = (requiredTier: string) => {
    const tierColors = {
      core: 'bg-blue-100 text-blue-700 border-blue-200',
      pro: 'bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 border-teal-200'
    };

    return (
      <Badge className={`ml-2 ${tierColors[requiredTier as keyof typeof tierColors]} flex items-center gap-1`}>
        <Crown className="w-3 h-3" />
        {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
      </Badge>
    );
  };

  const isFeatureAvailable = (requiredTier: string) => {
    const tierHierarchy = { starter: 0, core: 1, pro: 2 };
    return tierHierarchy[userTier as keyof typeof tierHierarchy] >= tierHierarchy[requiredTier as keyof typeof tierHierarchy];
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Transform progress into professional insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleGenerateReport('auto')}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>

        {/* Dashboard View */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* AI Narrative Summary */}
          <Card className="ai-insights-card p-6">
            <div className="flex items-start gap-4">
              <div className="ai-insights-icon p-2 rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  AI Insights Summary
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </h3>
                <p className="text-blue-800 leading-relaxed">
                  <strong>{userData.childName}</strong> gained 2 new communication skills this month. 
                  Bedtime routine success increased by 20%, while morning transition meltdowns 
                  decreased from 5 to 2 per week. Token board effectiveness remains high with 
                  consistent engagement in preferred activities.
                </p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">What's Working</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Areas to Focus</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Snapshot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {snapshotMetrics.map((metric) => (
              <Card key={metric.id} className="snapshot-metric-card p-4">
                <div className="flex items-center justify-between mb-3">
                  {metric.icon}
                  <div className={`flex items-center gap-1 text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metric.trend === 'up' && <ArrowUp className="w-3 h-3" />}
                    {metric.trend === 'down' && <ArrowDown className="w-3 h-3" />}
                    {Math.abs(metric.change)}%
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 mb-1">{metric.value}</p>
                  <p className="text-sm text-gray-600">{metric.title}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent Reports */}
          <Card className="reports-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Reports
            </h3>
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg ${isGenerating ? 'report-generating' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{report.title}</h4>
                      <Badge variant={report.status === 'ready' ? 'default' : 'secondary'}>
                        {report.status === 'ready' ? 'Ready' : 'Generating'}
                      </Badge>
                      {report.type === 'clinical' && !isFeatureAvailable('pro') && (
                        <Badge className="bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 border-teal-200">
                          Pro Only
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{report.period}</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      {report.insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {report.status === 'ready' ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleExport(report.id, 'pdf')}
                          disabled={isGenerating}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        {isFeatureAvailable('core') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleExport(report.id, 'csv')}
                            disabled={isGenerating}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            CSV
                          </Button>
                        )}
                        {isFeatureAvailable('core') && (
                          <Button variant="outline" size="sm">
                            <Share2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        Processing...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Progress View */}
        <TabsContent value="progress" className="space-y-6">
          {/* Skills Progress */}
          <Card className="reports-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Skills & Goals Progress
            </h3>
            <div className="space-y-6">
              {skillsProgress.map((skill) => (
                <div key={skill.domain}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{skill.domain}</span>
                    <span className="text-sm text-gray-600">{skill.current}% of {skill.target}%</span>
                  </div>
                  <div className="relative">
                    <div className="reports-progress-bar">
                      <div 
                        className={`reports-progress-fill ${
                          skill.domain === 'Communication' ? 'progress-communication' :
                          skill.domain === 'Social Skills' ? 'progress-social' :
                          skill.domain === 'Self-Regulation' ? 'progress-regulation' :
                          'progress-living'
                        }`}
                        style={{ width: `${skill.current}%` }}
                      />
                    </div>
                    <div 
                      className="absolute top-0 w-0.5 h-2 bg-gray-400"
                      style={{ left: `${skill.target}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Current: {skill.current}%</span>
                    <span>Target: {skill.target}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Recommendations */}
          <Card className="ai-recommendation-card p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              AI Recommendations
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <div className="recommendation-dot recommendation-ready" />
                <div>
                  <p className="font-medium text-gray-900">Ready to Master</p>
                  <p className="text-sm text-gray-600">
                    {userData.childName} is showing readiness for 3-step sequencing tasks in the morning routine.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <div className="recommendation-dot recommendation-strategy" />
                <div>
                  <p className="font-medium text-gray-900">Strategy Adjustment</p>
                  <p className="text-sm text-gray-600">
                    Consider rotating token board rewards weekly to maintain high engagement levels.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <div className="recommendation-dot recommendation-environment" />
                <div>
                  <p className="font-medium text-gray-900">Environmental Factor</p>
                  <p className="text-sm text-gray-600">
                    Skills practice is most successful during 10-11 AM timeframe based on data patterns.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Behavior View */}
        <TabsContent value="behavior" className="space-y-6">
          {/* Behavior Trends */}
          <Card className="reports-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Behavior Analysis
            </h3>
            <div className="space-y-4">
              {behaviorData.map((behavior, idx) => (
                <div key={idx} className="behavior-analysis-card flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-gray-900">{behavior.trigger}</h4>
                      <Badge 
                        className={`${
                          behavior.trend === 'down' 
                            ? 'behavior-trend-decreasing' 
                            : 'behavior-trend-stable'
                        }`}
                      >
                        {behavior.improvement}% improvement
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Frequency: {behavior.frequency}/week</span>
                      <span className={`flex items-center gap-1 ${
                        behavior.trend === 'down' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {behavior.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        {behavior.trend === 'down' ? 'Decreasing' : 'Stable'}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* ABC Analysis */}
          <Card className="reports-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ABC Analysis Heatmap</h3>
            <div className="abc-heatmap p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <h4 className="font-medium text-red-700 mb-2">Antecedents</h4>
                  <div className="space-y-2">
                    <div className="abc-antecedent px-3 py-1 rounded text-sm">Schedule changes</div>
                    <div className="abc-antecedent px-3 py-1 rounded text-sm">Loud noises</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-amber-700 mb-2">Behaviors</h4>
                  <div className="space-y-2">
                    <div className="abc-behavior px-3 py-1 rounded text-sm">Vocal protests</div>
                    <div className="abc-behavior px-3 py-1 rounded text-sm">Task avoidance</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-green-700 mb-2">Consequences</h4>
                  <div className="space-y-2">
                    <div className="abc-consequence px-3 py-1 rounded text-sm">Break offered</div>
                    <div className="abc-consequence px-3 py-1 rounded text-sm">Redirection</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Exports View */}
        <TabsContent value="exports" className="space-y-6">
          {/* Parity Note */}
          <Card className="reports-card p-4 bg-accent/5 border-accent/20">
            <p className="text-sm text-center text-gray-700">
              All charts match the dashboard. New data automatically updates exports.
            </p>
          </Card>

          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Tier Export */}
            <Card className="export-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="export-icon-parent p-2 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900">Weekly Outcomes PDF</h3>
                {getTierBadge('core')}
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Polished PDF with charts and plain-language narrative perfect for sharing with family.
              </p>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Visual progress charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Plain language insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Watermarked, expires in 7 days</span>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => isFeatureAvailable('core') ? handleExport('core', 'pdf') : onPaywallTrigger?.()}
                disabled={isGenerating || !isFeatureAvailable('core')}
                variant={!isFeatureAvailable('core') ? 'outline' : 'default'}
              >
                {!isFeatureAvailable('core') && <Lock className="w-4 h-4 mr-2" />}
                <Download className="w-4 h-4 mr-2" />
                Weekly Outcomes PDF (Core)
              </Button>
            </Card>

            {/* Pro/Pro Plus Export */}
            <Card className={`export-card p-6 ${!isFeatureAvailable('pro') ? 'export-card-disabled' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="export-icon-clinical p-2 rounded-lg">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  Provider-ready packet
                  {!isFeatureAvailable('pro') && getTierBadge('pro')}
                </h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Professional-grade reports with data analysis, session notes, and clinical recommendations.
              </p>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Full CSV data export</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Session annotations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Statistical analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Watermarked, expires in 7 days</span>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => isFeatureAvailable('pro') ? handleExport('pro', 'pdf') : onPaywallTrigger?.()}
                disabled={isGenerating || !isFeatureAvailable('pro')}
                variant={!isFeatureAvailable('pro') ? 'outline' : 'default'}
              >
                {!isFeatureAvailable('pro') && <Lock className="w-4 h-4 mr-2" />}
                <Download className="w-4 h-4 mr-2" />
                Provider-ready packet (Pro/Pro Plus)
              </Button>
            </Card>
          </div>

          {/* Coverage Clarity Summaries */}
          {savedCoverageSummaries.length > 0 && (
            <Card className="reports-card p-6 border-l-4 border-l-teal-500">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Coverage Clarity Summaries
                <Badge variant="secondary">{savedCoverageSummaries.length}</Badge>
              </h3>
              <div className="space-y-3">
                {savedCoverageSummaries.slice(0, 5).map((summary: any) => (
                  <div key={summary.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">
                        Coverage Summary for {summary.childName}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Generated {new Date(summary.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Share Bar */}
          {isFeatureAvailable('core') && (
            <Card className="reports-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy link
                </Button>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Email to provider
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Save to Vault
                </Button>
              </div>
            </Card>
          )}

          {/* Sharing Options */}
          {isFeatureAvailable('core') && (
            <Card className="reports-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Secure Sharing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="share-key-card p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Share Keys</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Your weekly progress is ready. Copy a safe 7-day share link for {safeChildName}'s teacher?
                  </p>
                  <Button variant="outline" size="sm" className="text-blue-700 border-blue-200">
                    Generate Share Key
                  </Button>
                </div>
                <div className="share-email-card p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Direct Email</h4>
                  <p className="text-green-700 text-sm mb-3">
                    Send watermarked reports directly to care team members.
                  </p>
                  <Button variant="outline" size="sm" className="text-green-700 border-green-200">
                    Email Report
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Tier Upgrade Prompt for Starter */}
          {userTier === 'starter' && (
            <Card className="tier-upgrade-card p-6">
              <div className="flex items-start gap-4">
                <div className="tier-upgrade-icon p-2 rounded-lg">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-2">Unlock Advanced Reporting</h3>
                  <p className="text-amber-800 mb-4">
                    Upgrade to Core or Pro for unlimited exports, CSV data downloads, and professional sharing features.
                  </p>
                  <Button onClick={onPaywallTrigger} className="bg-amber-600 hover:bg-amber-700">
                    View Upgrade Options
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Clinical Use Footer */}
          <div className="text-center py-4 border-t border-gray-200">
            <p className="text-sm text-muted-foreground">
              For clinical use with your provider. Not a diagnosis.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}