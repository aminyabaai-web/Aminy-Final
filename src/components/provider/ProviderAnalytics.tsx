/**
 * ProviderAnalytics - Enhanced Provider Portal Analytics Dashboard
 *
 * Features:
 * - Patient caseload overview
 * - Session analytics (completion rates, no-shows)
 * - Revenue tracking
 * - Outcome metrics
 * - Documentation compliance
 * - Trend analysis
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Download,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

// Types
interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
}

interface PatientMetric {
  id: string;
  name: string;
  sessionsCompleted: number;
  totalSessions: number;
  goalsProgress: number;
  lastSession: Date;
  status: 'on-track' | 'at-risk' | 'needs-attention';
}

interface SessionData {
  date: string;
  completed: number;
  cancelled: number;
  noShow: number;
}

interface ProviderAnalyticsProps {
  providerId: string;
  providerName: string;
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  onDateRangeChange?: (range: string) => void;
}

// Mock data
const MOCK_METRICS: MetricCard[] = [
  {
    id: 'caseload',
    title: 'Active Caseload',
    value: 24,
    change: 2,
    changeLabel: 'from last month',
    icon: <Users className="w-5 h-5" />,
    color: 'bg-blue-500',
  },
  {
    id: 'sessions',
    title: 'Sessions This Month',
    value: 87,
    change: 12,
    changeLabel: 'vs last month',
    icon: <Calendar className="w-5 h-5" />,
    color: 'bg-teal-500',
  },
  {
    id: 'revenue',
    title: 'Monthly Revenue',
    value: '$12,450',
    change: 8.5,
    changeLabel: 'vs last month',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'bg-green-500',
  },
  {
    id: 'completion',
    title: 'Session Completion',
    value: '94%',
    change: 3,
    changeLabel: 'improvement',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'bg-violet-500',
  },
];

const MOCK_PATIENTS: PatientMetric[] = [
  { id: '1', name: 'Alex M.', sessionsCompleted: 12, totalSessions: 14, goalsProgress: 78, lastSession: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'on-track' },
  { id: '2', name: 'Jordan S.', sessionsCompleted: 8, totalSessions: 12, goalsProgress: 45, lastSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), status: 'at-risk' },
  { id: '3', name: 'Taylor K.', sessionsCompleted: 16, totalSessions: 16, goalsProgress: 92, lastSession: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: 'on-track' },
  { id: '4', name: 'Casey R.', sessionsCompleted: 4, totalSessions: 10, goalsProgress: 23, lastSession: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), status: 'needs-attention' },
  { id: '5', name: 'Riley P.', sessionsCompleted: 10, totalSessions: 12, goalsProgress: 67, lastSession: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: 'on-track' },
];

const MOCK_SESSION_DATA: SessionData[] = [
  { date: 'Mon', completed: 8, cancelled: 1, noShow: 0 },
  { date: 'Tue', completed: 10, cancelled: 0, noShow: 1 },
  { date: 'Wed', completed: 7, cancelled: 2, noShow: 0 },
  { date: 'Thu', completed: 9, cancelled: 0, noShow: 0 },
  { date: 'Fri', completed: 6, cancelled: 1, noShow: 1 },
];

export function ProviderAnalytics({
  providerId,
  providerName,
  dateRange = 'month',
  onDateRangeChange,
}: ProviderAnalyticsProps) {
  const [selectedRange, setSelectedRange] = useState(dateRange);
  const [showExport, setShowExport] = useState(false);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalSessions = MOCK_SESSION_DATA.reduce((sum, d) => sum + d.completed + d.cancelled + d.noShow, 0);
    const completedSessions = MOCK_SESSION_DATA.reduce((sum, d) => sum + d.completed, 0);
    const cancelledSessions = MOCK_SESSION_DATA.reduce((sum, d) => sum + d.cancelled, 0);
    const noShowSessions = MOCK_SESSION_DATA.reduce((sum, d) => sum + d.noShow, 0);

    return {
      totalSessions,
      completedSessions,
      cancelledSessions,
      noShowSessions,
      completionRate: Math.round((completedSessions / totalSessions) * 100),
      cancellationRate: Math.round((cancelledSessions / totalSessions) * 100),
      noShowRate: Math.round((noShowSessions / totalSessions) * 100),
    };
  }, []);

  // Patient status counts
  const patientStatusCounts = useMemo(() => {
    return {
      onTrack: MOCK_PATIENTS.filter(p => p.status === 'on-track').length,
      atRisk: MOCK_PATIENTS.filter(p => p.status === 'at-risk').length,
      needsAttention: MOCK_PATIENTS.filter(p => p.status === 'needs-attention').length,
    };
  }, []);

  // Render metric card
  const renderMetricCard = (metric: MetricCard) => (
    <Card key={metric.id} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${metric.color} text-white`}>
          {metric.icon}
        </div>
        <div className={`flex items-center gap-1 text-xs ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {metric.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(metric.change)}%
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</h3>
      <p className="text-sm text-slate-500 mt-1">{metric.title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{metric.changeLabel}</p>
    </Card>
  );

  // Render patient row
  const renderPatientRow = (patient: PatientMetric) => {
    const statusConfig = {
      'on-track': { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      'at-risk': { color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-4 h-4" /> },
      'needs-attention': { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
    };

    const config = statusConfig[patient.status];
    const completionRate = Math.round((patient.sessionsCompleted / patient.totalSessions) * 100);

    return (
      <div key={patient.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <span className="font-medium text-slate-600">{patient.name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{patient.name}</p>
            <p className="text-xs text-slate-500">
              Last session: {patient.lastSession.toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{patient.sessionsCompleted}/{patient.totalSessions}</p>
            <p className="text-xs text-slate-500">sessions</p>
          </div>
          <div className="w-24">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Goals</span>
              <span>{patient.goalsProgress}%</span>
            </div>
            <Progress value={patient.goalsProgress} className="h-1.5" />
          </div>
          <Badge className={config.color}>
            {config.icon}
          </Badge>
        </div>
      </div>
    );
  };

  // Render session bar chart
  const maxSessions = Math.max(...MOCK_SESSION_DATA.map(d => d.completed + d.cancelled + d.noShow));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h2>
          <p className="text-slate-500">Performance overview for {providerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {selectedRange.charAt(0).toUpperCase() + selectedRange.slice(1)}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_METRICS.map(renderMetricCard)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Distribution Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Session Distribution</h3>
            <Badge className="bg-slate-100 text-slate-600">This Week</Badge>
          </div>
          <div className="space-y-4">
            {MOCK_SESSION_DATA.map((day) => {
              const total = day.completed + day.cancelled + day.noShow;
              const completedWidth = (day.completed / maxSessions) * 100;
              const cancelledWidth = (day.cancelled / maxSessions) * 100;
              const noShowWidth = (day.noShow / maxSessions) * 100;

              return (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 w-8">{day.date}</span>
                  <div className="flex-1 flex h-6 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <div
                      className="bg-teal-500 transition-all"
                      style={{ width: `${completedWidth}%` }}
                      title={`Completed: ${day.completed}`}
                    />
                    <div
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${cancelledWidth}%` }}
                      title={`Cancelled: ${day.cancelled}`}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${noShowWidth}%` }}
                      title={`No-show: ${day.noShow}`}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{total}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <span className="text-xs text-slate-500">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-slate-500">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-slate-500">No-show</span>
            </div>
          </div>
        </Card>

        {/* Patient Status Overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Patient Status</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{patientStatusCounts.onTrack}</p>
              <p className="text-xs text-green-600">On Track</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{patientStatusCounts.atRisk}</p>
              <p className="text-xs text-yellow-600">At Risk</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{patientStatusCounts.needsAttention}</p>
              <p className="text-xs text-red-600">Needs Attention</p>
            </div>
          </div>

          {/* Status Ring */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                />
                {/* On Track segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${(patientStatusCounts.onTrack / MOCK_PATIENTS.length) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
                {/* At Risk segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${(patientStatusCounts.atRisk / MOCK_PATIENTS.length) * 251.2} 251.2`}
                  strokeDashoffset={`${-(patientStatusCounts.onTrack / MOCK_PATIENTS.length) * 251.2}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold">{MOCK_PATIENTS.length}</p>
                  <p className="text-xs text-slate-500">Patients</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Patient List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Patient Overview</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </div>
        <div>
          {MOCK_PATIENTS.map(renderPatientRow)}
        </div>
      </Card>

      {/* Documentation Compliance */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Documentation Compliance</h3>
          <Badge className="bg-green-100 text-green-700">92% Complete</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">Session Notes</span>
            </div>
            <p className="text-2xl font-bold text-green-600">98%</p>
            <p className="text-xs text-slate-500">Completed within 24h</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">Goal Updates</span>
            </div>
            <p className="text-2xl font-bold text-teal-600">87%</p>
            <p className="text-xs text-slate-500">Updated this month</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">Progress Reports</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">100%</p>
            <p className="text-xs text-slate-500">On schedule</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">BIP Reviews</span>
            </div>
            <p className="text-2xl font-bold text-violet-600">85%</p>
            <p className="text-xs text-slate-500">Current quarter</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ProviderAnalytics;
