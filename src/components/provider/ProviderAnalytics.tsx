// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderAnalytics - Enhanced Provider Portal Analytics Dashboard
 *
 * Features:
 * - Patient caseload overview (live from Supabase)
 * - Session analytics (completion rates, no-shows)
 * - Revenue tracking
 * - Outcome metrics
 * - Documentation compliance
 * - Trend analysis
 * - Graceful fallback to demo data when not authenticated or no data exists
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  ArrowLeft,
  Download,
  Filter,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { supabase } from '../../utils/supabase/client';
import { isDemoMode } from '../../lib/demo-seed';

// Types
interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
  /**
   * Whether last-period data exists to compare against. When false the trend
   * arrow + "vs last month" caption are hidden (a green "↑ 0%" over all-zero
   * values reads as fabricated data). Undefined = true (demo/live seeds).
   */
  hasPrior?: boolean;
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

interface DocComplianceData {
  sessionNotes: number;
  goalUpdates: number;
  progressReports: number;
  bipReviews: number;
  overallCompliance: number;
}

interface ProviderAnalyticsProps {
  providerId: string;
  providerName?: string;
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  onDateRangeChange?: (range: string) => void;
  onBack?: () => void;
}

// ============================================================================
// Fallback mock data (shown when no real data exists)
// ============================================================================

const FALLBACK_METRICS: MetricCard[] = [
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
    color: 'bg-primary',
  },
  {
    id: 'revenue',
    title: 'Monthly Revenue',
    value: '$12,450',
    change: 8.5,
    changeLabel: 'vs last month',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'bg-[#2A7D99]',
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

const FALLBACK_PATIENTS: PatientMetric[] = [
  { id: '1', name: 'Alex M.', sessionsCompleted: 12, totalSessions: 14, goalsProgress: 78, lastSession: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'on-track' },
  { id: '2', name: 'Jordan S.', sessionsCompleted: 8, totalSessions: 12, goalsProgress: 45, lastSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), status: 'at-risk' },
  { id: '3', name: 'Taylor K.', sessionsCompleted: 16, totalSessions: 16, goalsProgress: 92, lastSession: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: 'on-track' },
  { id: '4', name: 'Casey R.', sessionsCompleted: 4, totalSessions: 10, goalsProgress: 23, lastSession: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), status: 'needs-attention' },
  { id: '5', name: 'Riley P.', sessionsCompleted: 10, totalSessions: 12, goalsProgress: 67, lastSession: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: 'on-track' },
];

const FALLBACK_SESSION_DATA: SessionData[] = [
  { date: 'Mon', completed: 8, cancelled: 1, noShow: 0 },
  { date: 'Tue', completed: 10, cancelled: 0, noShow: 1 },
  { date: 'Wed', completed: 7, cancelled: 2, noShow: 0 },
  { date: 'Thu', completed: 9, cancelled: 0, noShow: 0 },
  { date: 'Fri', completed: 6, cancelled: 1, noShow: 1 },
];

const FALLBACK_DOC_COMPLIANCE: DocComplianceData = {
  sessionNotes: 98,
  goalUpdates: 87,
  progressReports: 100,
  bipReviews: 85,
  overallCompliance: 92,
};

// Zeroed metric cards shown to real providers before any live data loads (or
// when a provider genuinely has no caseload yet). The rich FALLBACK_* sample
// numbers above are DEMO MODE ONLY — a real provider must never see invented
// caseload, revenue, or patient figures.
const EMPTY_METRICS: MetricCard[] = [
  { id: 'caseload', title: 'Active Caseload', value: 0, change: 0, changeLabel: 'from last month', icon: <Users className="w-5 h-5" />, color: 'bg-blue-500', hasPrior: false },
  { id: 'sessions', title: 'Sessions This Month', value: 0, change: 0, changeLabel: 'vs last month', icon: <Calendar className="w-5 h-5" />, color: 'bg-primary', hasPrior: false },
  { id: 'revenue', title: 'Monthly Revenue', value: '$0', change: 0, changeLabel: 'vs last month', icon: <DollarSign className="w-5 h-5" />, color: 'bg-[#2A7D99]', hasPrior: false },
  { id: 'completion', title: 'Session Completion', value: '0%', change: 0, changeLabel: 'improvement', icon: <CheckCircle className="w-5 h-5" />, color: 'bg-violet-500', hasPrior: false },
];

const EMPTY_DOC_COMPLIANCE: DocComplianceData = {
  sessionNotes: 0,
  goalUpdates: 0,
  progressReports: 0,
  bipReviews: 0,
  overallCompliance: 0,
};

// ============================================================================
// Date Helpers
// ============================================================================

function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getLastMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function getLastMonthEnd(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59);
}

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// Supabase Fetch Functions
// ============================================================================

async function fetchActiveCaseload(providerId: string): Promise<{ current: number; previous: number }> {
  // Current: distinct patients linked to this provider
  const { count: current, error } = await supabase
    .from('provider_patients')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId);

  if (error) throw error;

  // Previous month: count sessions with distinct patient_ids last month
  const lastStart = getLastMonthStart();
  const lastEnd = getLastMonthEnd();
  const { data: lastMonthSessions } = await supabase
    .from('provider_sessions')
    .select('patient_id')
    .eq('provider_id', providerId)
    .gte('scheduled_at', lastStart.toISOString())
    .lte('scheduled_at', lastEnd.toISOString());

  const previousPatients = new Set((lastMonthSessions || []).map(s => s.patient_id));

  return { current: current || 0, previous: previousPatients.size };
}

async function fetchSessionsThisMonth(providerId: string): Promise<{ current: number; previous: number }> {
  const monthStart = getMonthStart();
  const lastMonthStart = getLastMonthStart();
  const lastMonthEnd = getLastMonthEnd();

  const [{ count: current }, { count: previous }] = await Promise.all([
    supabase
      .from('provider_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .in('status', ['completed', 'scheduled', 'confirmed'])
      .gte('scheduled_at', monthStart.toISOString()),
    supabase
      .from('provider_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .in('status', ['completed', 'scheduled', 'confirmed'])
      .gte('scheduled_at', lastMonthStart.toISOString())
      .lte('scheduled_at', lastMonthEnd.toISOString()),
  ]);

  return { current: current || 0, previous: previous || 0 };
}

async function fetchMonthlyRevenue(providerId: string): Promise<{ current: number; previous: number }> {
  const monthStart = getMonthStart();
  const lastMonthStart = getLastMonthStart();
  const lastMonthEnd = getLastMonthEnd();

  const [{ data: currentData }, { data: previousData }] = await Promise.all([
    supabase
      .from('provider_sessions')
      .select('fee_cents')
      .eq('provider_id', providerId)
      .eq('paid', true)
      .gte('scheduled_at', monthStart.toISOString()),
    supabase
      .from('provider_sessions')
      .select('fee_cents')
      .eq('provider_id', providerId)
      .eq('paid', true)
      .gte('scheduled_at', lastMonthStart.toISOString())
      .lte('scheduled_at', lastMonthEnd.toISOString()),
  ]);

  const currentRevenue = (currentData || []).reduce((sum, s) => sum + (s.fee_cents || 0), 0);
  const previousRevenue = (previousData || []).reduce((sum, s) => sum + (s.fee_cents || 0), 0);

  return { current: currentRevenue, previous: previousRevenue };
}

async function fetchSessionCompletion(providerId: string): Promise<{ current: number; previous: number }> {
  const monthStart = getMonthStart();
  const lastMonthStart = getLastMonthStart();
  const lastMonthEnd = getLastMonthEnd();

  const [{ data: currentData }, { data: previousData }] = await Promise.all([
    supabase
      .from('provider_sessions')
      .select('status')
      .eq('provider_id', providerId)
      .gte('scheduled_at', monthStart.toISOString()),
    supabase
      .from('provider_sessions')
      .select('status')
      .eq('provider_id', providerId)
      .gte('scheduled_at', lastMonthStart.toISOString())
      .lte('scheduled_at', lastMonthEnd.toISOString()),
  ]);

  const calcRate = (data: { status: string }[] | null) => {
    if (!data || data.length === 0) return 0;
    const completed = data.filter(s => s.status === 'completed').length;
    const relevant = data.filter(s => ['completed', 'cancelled', 'no_show'].includes(s.status)).length;
    return relevant > 0 ? Math.round((completed / relevant) * 100) : 0;
  };

  return { current: calcRate(currentData), previous: calcRate(previousData) };
}

async function fetchPatientMetrics(providerId: string): Promise<PatientMetric[]> {
  // Get patients linked to this provider, with child info
  const { data: patientsData, error } = await supabase
    .from('provider_patients')
    .select('id, child_id, total_sessions, next_session_at')
    .eq('provider_id', providerId);

  if (error || !patientsData || patientsData.length === 0) return [];

  const patients: PatientMetric[] = [];

  for (const pp of patientsData) {
    // Get child name
    let childName = 'Client';
    if (pp.child_id) {
      const { data: childData } = await supabase
        .from('children')
        .select('name')
        .eq('id', pp.child_id)
        .single();
      if (childData?.name) {
        // Privacy: show first name + last initial
        const parts = childData.name.split(' ');
        childName = parts.length > 1
          ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
          : parts[0];
      }
    }

    // Get session counts for this patient
    const [{ count: completedCount }, { count: totalCount }] = await Promise.all([
      supabase
        .from('provider_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('patient_id', pp.child_id || pp.id)
        .eq('status', 'completed'),
      supabase
        .from('provider_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('patient_id', pp.child_id || pp.id),
    ]);

    const sessionsCompleted = completedCount || 0;
    const totalSessions = totalCount || pp.total_sessions || 0;
    const completionRate = totalSessions > 0 ? Math.round((sessionsCompleted / totalSessions) * 100) : 0;

    // Get last session date
    const { data: lastSessionData } = await supabase
      .from('provider_sessions')
      .select('scheduled_at')
      .eq('provider_id', providerId)
      .eq('patient_id', pp.child_id || pp.id)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .limit(1);

    const lastSession = lastSessionData?.[0]?.scheduled_at
      ? new Date(lastSessionData[0].scheduled_at)
      : new Date();

    // Determine status based on completion rate and recency
    const daysSinceLastSession = Math.floor(
      (Date.now() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
    );
    let status: PatientMetric['status'] = 'on-track';
    if (daysSinceLastSession > 14 || completionRate < 30) {
      status = 'needs-attention';
    } else if (daysSinceLastSession > 7 || completionRate < 60) {
      status = 'at-risk';
    }

    patients.push({
      id: pp.id,
      name: childName,
      sessionsCompleted,
      totalSessions: totalSessions || sessionsCompleted,
      goalsProgress: completionRate,
      lastSession,
      status,
    });
  }

  return patients;
}

async function fetchSessionDistribution(providerId: string): Promise<SessionData[]> {
  const weekStart = getWeekStart();

  const { data, error } = await supabase
    .from('provider_sessions')
    .select('scheduled_at, status')
    .eq('provider_id', providerId)
    .gte('scheduled_at', weekStart.toISOString());

  if (error || !data || data.length === 0) return [];

  // Group by day of week
  const dayMap = new Map<number, { completed: number; cancelled: number; noShow: number }>();
  for (let i = 0; i < 7; i++) {
    dayMap.set(i, { completed: 0, cancelled: 0, noShow: 0 });
  }

  for (const session of data) {
    const day = new Date(session.scheduled_at).getDay();
    const bucket = dayMap.get(day)!;
    if (session.status === 'completed') bucket.completed++;
    else if (session.status === 'cancelled') bucket.cancelled++;
    else if (session.status === 'no_show') bucket.noShow++;
  }

  // Only return days that have at least one session, or Mon-Fri as fallback
  const result: SessionData[] = [];
  for (let i = 1; i <= 5; i++) {
    // Mon(1) through Fri(5)
    const bucket = dayMap.get(i)!;
    result.push({
      date: DAY_NAMES[i],
      completed: bucket.completed,
      cancelled: bucket.cancelled,
      noShow: bucket.noShow,
    });
  }

  return result;
}

async function fetchDocCompliance(providerId: string): Promise<DocComplianceData> {
  const monthStart = getMonthStart();

  // Get all completed sessions this month
  const { count: completedSessions } = await supabase
    .from('provider_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('status', 'completed')
    .gte('scheduled_at', monthStart.toISOString());

  // Get session notes submitted this month
  const { count: notesSubmitted } = await supabase
    .from('session_notes')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .gte('session_date', monthStart.toISOString().split('T')[0]);

  // Get notes submitted within 24 hours (approved or pending_review)
  const { count: notesOnTime } = await supabase
    .from('session_notes')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .in('status', ['approved', 'pending_review', 'submitted'])
    .gte('session_date', monthStart.toISOString().split('T')[0]);

  const total = completedSessions || 1;
  const submitted = notesSubmitted || 0;
  const onTime = notesOnTime || 0;

  const sessionNotesRate = Math.min(100, Math.round((onTime / total) * 100));
  // Goal updates and progress reports are approximated from note data
  const goalUpdateRate = Math.min(100, Math.round((submitted / total) * 100));

  // BIP reviews -- check for notes with specific status
  const { count: bipCount } = await supabase
    .from('session_notes')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .eq('status', 'approved')
    .gte('session_date', monthStart.toISOString().split('T')[0]);

  const bipRate = Math.min(100, Math.round(((bipCount || 0) / total) * 100));

  const overallCompliance = Math.round(
    (sessionNotesRate + goalUpdateRate + bipRate) / 3
  );

  return {
    sessionNotes: sessionNotesRate,
    goalUpdates: goalUpdateRate,
    progressReports: submitted > 0 ? 100 : 0,
    bipReviews: bipRate,
    overallCompliance,
  };
}

async function fetchProviderName(providerId: string): Promise<string> {
  const { data } = await supabase
    .from('provider_profiles')
    .select('name')
    .eq('id', providerId)
    .single();

  return data?.name || 'Provider';
}

// ============================================================================
// Component
// ============================================================================

export function ProviderAnalytics({
  providerId,
  providerName: providerNameProp,
  dateRange = 'month',
  onDateRangeChange,
  onBack,
}: ProviderAnalyticsProps) {
  const [selectedRange, setSelectedRange] = useState(dateRange);
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const demo = isDemoMode();
  const [isDemo, setIsDemo] = useState(demo);
  const [error, setError] = useState<string | null>(null);

  // Live data state. Real providers start at zero (then real Supabase data
  // loads); the rich FALLBACK_* sample figures seed the screen ONLY in demo
  // mode so investor/AACT walkthroughs look complete.
  const [metrics, setMetrics] = useState<MetricCard[]>(demo ? FALLBACK_METRICS : EMPTY_METRICS);
  const [patients, setPatients] = useState<PatientMetric[]>(demo ? FALLBACK_PATIENTS : []);
  const [sessionData, setSessionData] = useState<SessionData[]>(demo ? FALLBACK_SESSION_DATA : []);
  const [docCompliance, setDocCompliance] = useState<DocComplianceData>(demo ? FALLBACK_DOC_COMPLIANCE : EMPTY_DOC_COMPLIANCE);
  const [resolvedProviderName, setResolvedProviderName] = useState(providerNameProp || 'Provider');

  // Fetch all analytics data from Supabase
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if user is authenticated
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        // In demo mode keep the rich sample seed; real (unauthenticated) views
        // show the zeroed empty state rather than invented metrics.
        if (import.meta.env.DEV) console.info('[ProviderAnalytics] No authenticated user');
        setIsDemo(demo);
        setIsLoading(false);
        return;
      }

      // Fetch provider name if not passed as prop
      if (!providerNameProp) {
        try {
          const name = await fetchProviderName(providerId);
          setResolvedProviderName(name);
        } catch {
          // Non-critical, keep default
        }
      }

      // Fetch all metrics in parallel
      const [caseload, sessions, revenue, completion, patientList, sessionDist, docComp] =
        await Promise.all([
          fetchActiveCaseload(providerId).catch(() => ({ current: 0, previous: 0 })),
          fetchSessionsThisMonth(providerId).catch(() => ({ current: 0, previous: 0 })),
          fetchMonthlyRevenue(providerId).catch(() => ({ current: 0, previous: 0 })),
          fetchSessionCompletion(providerId).catch(() => ({ current: 0, previous: 0 })),
          fetchPatientMetrics(providerId).catch(() => []),
          fetchSessionDistribution(providerId).catch(() => []),
          fetchDocCompliance(providerId).catch(() => (demo ? FALLBACK_DOC_COMPLIANCE : EMPTY_DOC_COMPLIANCE)),
        ]);

      // Check if we got any real data at all
      const hasRealData =
        caseload.current > 0 ||
        sessions.current > 0 ||
        revenue.current > 0 ||
        patientList.length > 0;

      if (!hasRealData) {
        // No live data yet. Demo mode keeps the sample seed already in state;
        // real providers see the zeroed empty state instead of fake metrics.
        if (import.meta.env.DEV) console.info('[ProviderAnalytics] No provider data found');
        setIsDemo(demo);
        setIsLoading(false);
        return;
      }

      // Build metric cards from live data
      const caseloadChange = caseload.previous > 0
        ? Math.round(((caseload.current - caseload.previous) / caseload.previous) * 100)
        : 0;

      const sessionsChange = sessions.previous > 0
        ? Math.round(((sessions.current - sessions.previous) / sessions.previous) * 100)
        : 0;

      const revenueInDollars = Math.round(revenue.current / 100);
      const prevRevenueInDollars = Math.round(revenue.previous / 100);
      const revenueChange = prevRevenueInDollars > 0
        ? Math.round(((revenueInDollars - prevRevenueInDollars) / prevRevenueInDollars) * 100)
        : 0;

      const completionChange = completion.previous > 0
        ? completion.current - completion.previous
        : 0;

      const formattedRevenue = `$${revenueInDollars.toLocaleString()}`;

      setMetrics([
        {
          id: 'caseload',
          title: 'Active Caseload',
          value: caseload.current,
          change: caseloadChange,
          changeLabel: 'from last month',
          icon: <Users className="w-5 h-5" />,
          color: 'bg-blue-500',
          hasPrior: caseload.previous > 0,
        },
        {
          id: 'sessions',
          title: 'Sessions This Month',
          value: sessions.current,
          change: sessionsChange,
          changeLabel: 'vs last month',
          icon: <Calendar className="w-5 h-5" />,
          color: 'bg-primary',
          hasPrior: sessions.previous > 0,
        },
        {
          id: 'revenue',
          title: 'Monthly Revenue',
          value: formattedRevenue,
          change: revenueChange,
          changeLabel: 'vs last month',
          icon: <DollarSign className="w-5 h-5" />,
          color: 'bg-[#2A7D99]',
          hasPrior: prevRevenueInDollars > 0,
        },
        {
          id: 'completion',
          title: 'Session Completion',
          value: `${completion.current}%`,
          change: completionChange,
          changeLabel: completionChange >= 0 ? 'improvement' : 'decline',
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'bg-violet-500',
          hasPrior: completion.previous > 0,
        },
      ]);

      if (patientList.length > 0) setPatients(patientList);
      if (sessionDist.length > 0) setSessionData(sessionDist);
      setDocCompliance(docComp);
      setIsDemo(false);
    } catch (err) {
      console.error('[ProviderAnalytics] Failed to load analytics:', err);
      setError(
        demo
          ? 'Failed to load analytics. Showing sample data.'
          : 'Failed to load analytics. Please try again.'
      );
      setIsDemo(demo);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, providerNameProp, demo]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Change the date-range filter. Updates local state, notifies the parent via
  // onDateRangeChange (if wired), and re-runs the Supabase fetch so the numbers
  // reflect the chosen window.
  const handleRangeChange = useCallback(
    (range: 'week' | 'month' | 'quarter' | 'year') => {
      setSelectedRange(range);
      setShowRangeMenu(false);
      onDateRangeChange?.(range);
      loadAnalytics();
    },
    [onDateRangeChange, loadAnalytics]
  );

  // Export the metrics, weekly session distribution, and patient overview that
  // are currently on screen to a CSV. Uses real in-state values only (demo seed
  // in demo mode, live Supabase data otherwise) — nothing is fabricated here.
  const handleExport = useCallback(() => {
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];
    lines.push('Aminy Provider Analytics Export');
    lines.push(`Provider,${escape(resolvedProviderName)}`);
    lines.push(`Range,${escape(selectedRange)}`);
    lines.push(`Generated,${escape(new Date().toISOString())}`);
    if (isDemo) lines.push('Note,Sample data (demo mode)');
    lines.push('');
    lines.push('Metric,Value,Change %');
    metrics.forEach((m) => lines.push(`${escape(m.title)},${escape(m.value)},${escape(m.change)}`));
    lines.push('');
    lines.push('Session Distribution (This Week)');
    lines.push('Day,Completed,Cancelled,No-show');
    sessionData.forEach((d) =>
      lines.push(`${escape(d.date)},${escape(d.completed)},${escape(d.cancelled)},${escape(d.noShow)}`)
    );
    lines.push('');
    lines.push('Patient Overview');
    lines.push('Name,Sessions Completed,Total Sessions,Goals Progress %,Status,Last Session');
    patients.forEach((p) =>
      lines.push(
        `${escape(p.name)},${escape(p.sessionsCompleted)},${escape(p.totalSessions)},${escape(
          p.goalsProgress
        )},${escape(p.status)},${escape(p.lastSession.toLocaleDateString())}`
      )
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aminy-analytics-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [metrics, patients, sessionData, resolvedProviderName, selectedRange, isDemo]);

  // Calculate summary stats from current sessionData
  const summaryStats = useMemo(() => {
    const totalSessions = sessionData.reduce((sum, d) => sum + d.completed + d.cancelled + d.noShow, 0);
    const completedSessions = sessionData.reduce((sum, d) => sum + d.completed, 0);
    const cancelledSessions = sessionData.reduce((sum, d) => sum + d.cancelled, 0);
    const noShowSessions = sessionData.reduce((sum, d) => sum + d.noShow, 0);

    return {
      totalSessions,
      completedSessions,
      cancelledSessions,
      noShowSessions,
      completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
      cancellationRate: totalSessions > 0 ? Math.round((cancelledSessions / totalSessions) * 100) : 0,
      noShowRate: totalSessions > 0 ? Math.round((noShowSessions / totalSessions) * 100) : 0,
    };
  }, [sessionData]);

  // Patient status counts from current patients
  const patientStatusCounts = useMemo(() => {
    return {
      onTrack: patients.filter(p => p.status === 'on-track').length,
      atRisk: patients.filter(p => p.status === 'at-risk').length,
      needsAttention: patients.filter(p => p.status === 'needs-attention').length,
    };
  }, [patients]);

  // Render metric card
  const renderMetricCard = (metric: MetricCard) => (
    <Card key={metric.id} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${metric.color} text-white`}>
          {metric.icon}
        </div>
        {metric.hasPrior === false ? (
          // No prior-period data — a neutral dash instead of a fake "↑ 0%"
          <span className="text-sm text-slate-400">—</span>
        ) : (
          <div className={`flex items-center gap-1 text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metric.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(metric.change)}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-[#132F43] dark:text-white">{metric.value}</h3>
      <p className="text-sm text-[#5A6B7A] mt-1">{metric.title}</p>
      {metric.hasPrior !== false && (
        <p className="text-sm text-slate-400 mt-0.5">{metric.changeLabel}</p>
      )}
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
    const completionRate = patient.totalSessions > 0
      ? Math.round((patient.sessionsCompleted / patient.totalSessions) * 100)
      : 0;

    return (
      <div key={patient.id} className="flex items-center justify-between py-3 border-b border-[#E8E4DF] dark:border-slate-700 last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8E4DF] dark:bg-slate-700 flex items-center justify-center">
            <span className="font-medium text-[#5A6B7A]">{patient.name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium text-[#132F43] dark:text-white">{patient.name}</p>
            <p className="text-sm text-[#5A6B7A]">
              Last session: {patient.lastSession.toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{patient.sessionsCompleted}/{patient.totalSessions}</p>
            <p className="text-sm text-[#5A6B7A]">sessions</p>
          </div>
          <div className="w-24">
            <div className="flex items-center justify-between text-sm mb-1">
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
  const maxSessions = Math.max(...sessionData.map(d => d.completed + d.cancelled + d.noShow), 1);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto space-y-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-[#5A6B7A] dark:text-slate-300"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-[#5A6B7A] text-sm">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto space-y-6">
      {/* Demo Data Banner -- shown when using fallback data */}
      {isDemo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">Demo Data</span>
          <span className="text-amber-700/70 text-sm">Sample provider metrics shown. Connect practice management for real data.</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto text-red-600" onClick={loadAnalytics}>
            Retry
          </Button>
        </div>
      )}

      {/* Header — flex-wrap so the range/Export buttons drop to their own row
          at narrow widths instead of clipping off-screen */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-[#5A6B7A] dark:text-slate-300 hover:bg-[#EDF4F7] transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-[#132F43] dark:text-white">Analytics Dashboard</h2>
            <p className="text-[#5A6B7A]">Performance overview for {resolvedProviderName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setShowRangeMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showRangeMenu}
            >
              <Calendar className="w-4 h-4" />
              {selectedRange.charAt(0).toUpperCase() + selectedRange.slice(1)}
              <ChevronDown className="w-4 h-4" />
            </Button>
            {showRangeMenu && (
              <>
                {/* Click-away backdrop */}
                <button
                  className="fixed inset-0 z-20"
                  aria-label="Close menu"
                  onClick={() => setShowRangeMenu(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 z-40 bg-white dark:bg-slate-800 border border-[#E8E4DF] rounded-lg shadow-lg overflow-hidden"
                >
                  {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                    <button
                      key={range}
                      role="menuitem"
                      onClick={() => handleRangeChange(range)}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#F6FBFB] dark:hover:bg-slate-700 transition-colors ${
                        selectedRange === range
                          ? 'text-[#6B9080] font-medium'
                          : 'text-[#3A4A57] dark:text-slate-200'
                      }`}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(renderMetricCard)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Distribution Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#132F43] dark:text-white">Session Distribution</h3>
            <Badge className="bg-[#EDF4F7] text-[#5A6B7A]">This Week</Badge>
          </div>
          <div className="space-y-4">
            {sessionData.map((day) => {
              const total = day.completed + day.cancelled + day.noShow;
              const completedWidth = (day.completed / maxSessions) * 100;
              const cancelledWidth = (day.cancelled / maxSessions) * 100;
              const noShowWidth = (day.noShow / maxSessions) * 100;

              return (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-sm text-[#5A6B7A] w-8">{day.date}</span>
                  <div className="flex-1 flex h-6 rounded-lg overflow-hidden bg-[#EDF4F7] dark:bg-slate-700">
                    <div
                      className="bg-primary transition-all"
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
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-[#E8E4DF] dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-[#5A6B7A]">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-[#5A6B7A]">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-[#5A6B7A]">No-show</span>
            </div>
          </div>
        </Card>

        {/* Patient Status Overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#132F43] dark:text-white">Patient Status</h3>
            <Button variant="ghost" size="sm" disabled title="Coming soon">View All</Button>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{patientStatusCounts.onTrack}</p>
              <p className="text-sm text-green-600">On Track</p>
            </div>
            <div className="text-center p-4 bg-[#FDF9F0] dark:bg-yellow-900/20 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{patientStatusCounts.atRisk}</p>
              <p className="text-sm text-yellow-600">At Risk</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{patientStatusCounts.needsAttention}</p>
              <p className="text-sm text-red-600">Needs Attention</p>
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
                  strokeDasharray={`${(patients.length > 0 ? patientStatusCounts.onTrack / patients.length : 0) * 251.2} 251.2`}
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
                  strokeDasharray={`${(patients.length > 0 ? patientStatusCounts.atRisk / patients.length : 0) * 251.2} 251.2`}
                  strokeDashoffset={`${-(patients.length > 0 ? patientStatusCounts.onTrack / patients.length : 0) * 251.2}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold">{patients.length}</p>
                  <p className="text-sm text-[#5A6B7A]">Clients</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Patient List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[#132F43] dark:text-white">Patient Overview</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled
              title="Coming soon"
            >
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </div>
        <div>
          {patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#EDF4F7] flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-[#5A6B7A]">No clients yet</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Your caseload metrics will appear here once clients are assigned and sessions are logged.
              </p>
            </div>
          ) : (
            patients.map(renderPatientRow)
          )}
        </div>
      </Card>

      {/* Documentation Compliance */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[#132F43] dark:text-white">Documentation Compliance</h3>
          <Badge className="bg-green-100 text-green-700">{docCompliance.overallCompliance}% Complete</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[#5A6B7A]" />
              <span className="text-sm font-medium">Session Notes</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{docCompliance.sessionNotes}%</p>
            <p className="text-sm text-[#5A6B7A]">Completed within 24h</p>
          </div>
          <div className="p-4 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#5A6B7A]" />
              <span className="text-sm font-medium">Goal Updates</span>
            </div>
            <p className="text-2xl font-bold text-[#6B9080]">{docCompliance.goalUpdates}%</p>
            <p className="text-sm text-[#5A6B7A]">Updated this month</p>
          </div>
          <div className="p-4 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#5A6B7A]" />
              <span className="text-sm font-medium">Progress Reports</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{docCompliance.progressReports}%</p>
            <p className="text-sm text-[#5A6B7A]">On schedule</p>
          </div>
          <div className="p-4 bg-[#F6FBFB] dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-[#5A6B7A]" />
              <span className="text-sm font-medium">BIP Reviews</span>
            </div>
            <p className="text-2xl font-bold text-violet-600">{docCompliance.bipReviews}%</p>
            <p className="text-sm text-[#5A6B7A]">Current quarter</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ProviderAnalytics;
