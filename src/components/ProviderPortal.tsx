/**
 * ProviderPortal.tsx
 *
 * Provider-facing portal that enables "business in a box" functionality
 * for independent clinicians on the Aminy marketplace.
 *
 * Features:
 * - Patient roster with Insight Navigator access (with parent permission)
 * - Upcoming sessions management
 * - Session notes and documentation
 * - Earnings and practice analytics
 * - Quick access to patient profiles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Logo } from './Logo';
import {
  Users,
  Calendar,
  FileText,
  Clock,
  Video,
  DollarSign,
  Bell,
  Search,
  ChevronRight,
  Star,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Eye,
  Lock,
  Unlock,
  MessageSquare,
  Brain,
  Heart,
  Sparkles,
  Settings,
  LogOut,
  Home,
  BookOpen,
  ClipboardList,
  BarChart3,
  Shield,
  UserCheck,
  Play,
  Pause,
  ExternalLink,
  Loader2,
  RefreshCw,
  Plus,
  Save,
  X
} from 'lucide-react';
import type { ProviderType } from '../lib/child-profiles';
import { brandColors } from '../lib/brand-system';
import { supabase } from '../utils/supabase/client';
import { CredentialBadge, VerifiedBadge } from './provider/CredentialBadge';
import { PatientAISummary } from './provider/PatientAISummary';

interface Patient {
  id: string;
  childName: string;
  parentName: string;
  age: number;
  conditions: string[];
  profileAccess: 'granted' | 'pending' | 'revoked';
  nextSession?: Date;
  totalSessions: number;
  lastSessionNotes?: string;
  photo?: string;
}

interface Session {
  id: string;
  patientId: string;
  patientName: string;
  parentName: string;
  scheduledAt: Date;
  duration: number;
  type: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
  hasInsightAccess: boolean;
}

interface ProviderProfile {
  id: string;
  name: string;
  credentials: string;
  type: ProviderType;
  photo?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  totalPatients: number;
  sessionsThisMonth: number;
  earningsThisMonth: number;
}

interface ProviderPortalProps {
  providerId: string;
}

export function ProviderPortal({ providerId }: ProviderPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'sessions' | 'earnings' | 'settings' | 'ai-summaries'>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showSessionNotes, setShowSessionNotes] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [earnings, setEarnings] = useState<{ thisMonth: number; lastMonth: number; pending: number; ytd: number }>({
    thisMonth: 0, lastMonth: 0, pending: 0, ytd: 0
  });

  // Load provider data from Supabase
  const loadProviderData = useCallback(async () => {
    setIsRefreshing(true);
    console.log('[ProviderPortal] Loading data for provider:', providerId);

    try {
      // Fetch provider profile
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', providerId)
        .single();

      if (providerError && providerError.code !== 'PGRST116') {
        console.error('[ProviderPortal] Error fetching provider:', providerError);
      }

      // If no provider found in DB, use fallback mock data for demo
      if (providerData) {
        setProvider({
          id: providerData.id,
          name: providerData.name,
          credentials: providerData.credentials,
          type: providerData.provider_type as ProviderType,
          photo: providerData.photo_url,
          specialties: providerData.specialties || [],
          rating: providerData.rating || 0,
          reviewCount: providerData.review_count || 0,
          totalPatients: 0, // Will be calculated from patients
          sessionsThisMonth: 0,
          earningsThisMonth: 0,
        });
      } else {
        // Fallback for demo
        setProvider({
          id: providerId,
          name: 'Dr. Sarah Mitchell',
          credentials: 'BCBA, LBA',
          type: 'bcba',
          specialties: ['Autism Spectrum', 'Early Intervention', 'Parent Training'],
          rating: 4.9,
          reviewCount: 127,
          totalPatients: 0,
          sessionsThisMonth: 0,
          earningsThisMonth: 0
        });
      }

      // Fetch provider's patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('provider_patients')
        .select(`
          id,
          child_id,
          parent_user_id,
          profile_access,
          total_sessions,
          next_session_at,
          created_at
        `)
        .eq('provider_id', providerId);

      if (patientsError) {
        console.error('[ProviderPortal] Error fetching patients:', patientsError);
      }

      // Get child profiles for patient details
      const patientsList: Patient[] = [];
      if (patientsData && patientsData.length > 0) {
        for (const pp of patientsData) {
          // Fetch child profile
          const { data: childData } = await supabase
            .from('child_profiles')
            .select('name, date_of_birth, diagnoses')
            .eq('id', pp.child_id)
            .single();

          // Fetch parent profile
          const { data: parentData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', pp.parent_user_id)
            .single();

          if (childData) {
            const birthDate = childData.date_of_birth ? new Date(childData.date_of_birth) : null;
            const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

            patientsList.push({
              id: pp.id,
              childName: childData.name || 'Unknown',
              parentName: parentData?.name || 'Unknown',
              age,
              conditions: childData.diagnoses || [],
              profileAccess: pp.profile_access as 'granted' | 'pending' | 'revoked',
              nextSession: pp.next_session_at ? new Date(pp.next_session_at) : undefined,
              totalSessions: pp.total_sessions || 0,
            });
          }
        }
      }

      // If no patients in DB, use demo data
      if (patientsList.length === 0) {
        patientsList.push(
          {
            id: '1',
            childName: 'Emma Thompson',
            parentName: 'Jennifer Thompson',
            age: 6,
            conditions: ['Autism Level 1', 'Sensory Processing'],
            profileAccess: 'granted',
            nextSession: new Date(Date.now() + 2 * 60 * 60 * 1000),
            totalSessions: 12,
            lastSessionNotes: 'Excellent progress with turn-taking. Continue reinforcing joint attention activities.'
          },
          {
            id: '2',
            childName: 'Liam Chen',
            parentName: 'David Chen',
            age: 4,
            conditions: ['Autism Level 2', 'Speech Delay'],
            profileAccess: 'granted',
            nextSession: new Date(Date.now() + 24 * 60 * 60 * 1000),
            totalSessions: 8,
          },
          {
            id: '3',
            childName: 'Sofia Rodriguez',
            parentName: 'Maria Rodriguez',
            age: 7,
            conditions: ['ADHD Combined', 'Anxiety'],
            profileAccess: 'pending',
            totalSessions: 0
          }
        );
      }

      setPatients(patientsList);

      // Fetch provider's sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('provider_sessions')
        .select(`
          id,
          patient_id,
          scheduled_at,
          duration_minutes,
          session_type,
          status,
          fee_cents,
          paid
        `)
        .eq('provider_id', providerId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (sessionsError) {
        console.error('[ProviderPortal] Error fetching sessions:', sessionsError);
      }

      const sessionsList: Session[] = [];
      if (sessionsData && sessionsData.length > 0) {
        for (const sess of sessionsData) {
          const patient = patientsList.find(p => p.id === sess.patient_id);
          sessionsList.push({
            id: sess.id,
            patientId: sess.patient_id,
            patientName: patient?.childName || 'Unknown',
            parentName: patient?.parentName || 'Unknown',
            scheduledAt: new Date(sess.scheduled_at),
            duration: sess.duration_minutes || 50,
            type: sess.session_type === 'telehealth' ? 'Telehealth Session' : 'In-Person Session',
            status: sess.status === 'scheduled' || sess.status === 'confirmed' ? 'upcoming' : sess.status as 'in-progress' | 'completed' | 'cancelled',
            hasInsightAccess: patient?.profileAccess === 'granted',
          });
        }
      }

      // If no sessions in DB, use demo data
      if (sessionsList.length === 0) {
        sessionsList.push(
          {
            id: 's1',
            patientId: '1',
            patientName: 'Emma Thompson',
            parentName: 'Jennifer Thompson',
            scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
            duration: 50,
            type: 'Parent Consultation',
            status: 'upcoming',
            hasInsightAccess: true
          },
          {
            id: 's2',
            patientId: '2',
            patientName: 'Liam Chen',
            parentName: 'David Chen',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            duration: 50,
            type: 'Follow-up Session',
            status: 'upcoming',
            hasInsightAccess: true
          }
        );
      }

      setSessions(sessionsList);

      // Fetch earnings
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const { data: earningsData } = await supabase
        .from('provider_earnings')
        .select('net_amount_cents, status, created_at')
        .eq('provider_id', providerId);

      if (earningsData) {
        let thisMonth = 0, lastMonth = 0, pending = 0, ytd = 0;
        earningsData.forEach(e => {
          const created = new Date(e.created_at);
          const amount = e.net_amount_cents || 0;

          if (e.status === 'pending') pending += amount;
          if (created >= startOfYear) ytd += amount;
          if (created >= startOfMonth) thisMonth += amount;
          else if (created >= startOfLastMonth) lastMonth += amount;
        });

        setEarnings({
          thisMonth: Math.round(thisMonth / 100),
          lastMonth: Math.round(lastMonth / 100),
          pending: Math.round(pending / 100),
          ytd: Math.round(ytd / 100),
        });
      } else {
        // Demo earnings
        setEarnings({ thisMonth: 4158, lastMonth: 3856, pending: 594, ytd: 28420 });
      }

      // Update provider stats
      setProvider(prev => prev ? {
        ...prev,
        totalPatients: patientsList.length,
        sessionsThisMonth: sessionsData?.length || sessionsList.length,
        earningsThisMonth: earnings.thisMonth || 4158,
      } : null);

    } catch (error) {
      console.error('[ProviderPortal] Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadProviderData();
  }, [loadProviderData]);

  // Save session notes
  const handleSaveSessionNotes = async (sessionId: string) => {
    setIsSavingNotes(true);
    try {
      // Find the session to get provider_id
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const { error } = await supabase.from('session_notes').insert({
        session_id: sessionId,
        provider_id: providerId,
        note_type: 'progress',
        subjective: sessionNotes.subjective || null,
        objective: sessionNotes.objective || null,
        assessment: sessionNotes.assessment || null,
        plan: sessionNotes.plan || null,
        shared_with_parent: false,
      });

      if (error) throw error;

      setShowSessionNotes(null);
      setSessionNotes({ subjective: '', objective: '', assessment: '', plan: '' });
    } catch (err) {
      console.error('[ProviderPortal] Error saving session notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 1) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes}m`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getConditionColor = (condition: string) => {
    if (condition.includes('Autism')) return 'bg-teal-100 text-teal-700';
    if (condition.includes('ADHD')) return 'bg-violet-100 text-violet-700';
    if (condition.includes('Anxiety')) return 'bg-blue-100 text-blue-700';
    if (condition.includes('Sensory')) return 'bg-orange-100 text-orange-700';
    if (condition.includes('Speech')) return 'bg-green-100 text-green-700';
    return 'bg-neutral-100 text-neutral-700';
  };

  if (isLoading || !provider) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-slate-400">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const filteredPatients = patients.filter(p =>
    p.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.parentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingSessions = sessions
    .filter(s => s.status === 'upcoming')
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const nextSession = upcomingSessions[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 sm:gap-4">
              <Logo size={32} showText={false} />
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-neutral-900 dark:text-white">Provider Portal</span>
                <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-medium">
                  {provider.credentials}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadProviderData()}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-5 h-5 text-neutral-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5 text-neutral-600 dark:text-slate-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                  {provider.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{provider.name}</p>
                    <VerifiedBadge status="verified" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">{provider.credentials}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-900 border-b border-neutral-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'patients', label: 'Patients', icon: Users },
              { id: 'ai-summaries', label: 'AI Summaries', icon: Brain },
              { id: 'sessions', label: 'Sessions', icon: Calendar },
              { id: 'earnings', label: 'Earnings', icon: DollarSign },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Welcome & Next Session */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
              {/* Welcome Card */}
              <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200/60">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                      Welcome back, {provider.name.split(' ')[0]}
                    </h1>
                    <p className="text-neutral-600 mt-1">
                      You have {upcomingSessions.length} sessions scheduled this week
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-white/80 rounded-lg px-3 py-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-neutral-900">{provider.rating}</span>
                    <span className="text-neutral-500 text-sm">({provider.reviewCount})</span>
                  </div>
                </div>

                {nextSession && (
                  <div className="mt-4 sm:mt-6 p-4 bg-white rounded-xl border border-teal-200/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                          <span className="text-lg font-semibold text-violet-700">
                            {nextSession.patientName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">
                            {nextSession.patientName}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {nextSession.type} with {nextSession.parentName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-teal-600">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">
                            in {formatTimeUntil(nextSession.scheduledAt)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500">
                          {nextSession.duration} min session
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button className="flex-1 bg-teal-600 hover:bg-teal-700">
                        <Video className="w-4 h-4 mr-2" />
                        Start Session
                      </Button>
                      {nextSession.hasInsightAccess && (
                        <Button variant="outline" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          View Insight Navigator
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              {/* Stats Card */}
              <Card className="p-4 sm:p-5 md:p-6">
                <h3 className="font-semibold text-neutral-900 mb-4">This Month</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-neutral-600">Active Patients</span>
                    </div>
                    <span className="text-xl font-bold text-neutral-900">{provider.totalPatients}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-violet-600" />
                      </div>
                      <span className="text-neutral-600">Sessions</span>
                    </div>
                    <span className="text-xl font-bold text-neutral-900">{provider.sessionsThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-neutral-600">Earnings</span>
                    </div>
                    <span className="text-xl font-bold text-neutral-900">
                      ${provider.earningsThisMonth.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Access - Patients Needing Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
              {/* Pending Profile Access */}
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-neutral-900">Pending Profile Access</h3>
                  <Badge className="bg-amber-100 text-amber-700">
                    {patients.filter(p => p.profileAccess === 'pending').length} pending
                  </Badge>
                </div>
                <div className="space-y-3">
                  {patients
                    .filter(p => p.profileAccess === 'pending')
                    .map(patient => (
                      <div key={patient.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200/60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">{patient.childName}</p>
                            <p className="text-sm text-neutral-500">
                              Awaiting {patient.parentName}'s approval
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Remind
                        </Button>
                      </div>
                    ))}
                  {patients.filter(p => p.profileAccess === 'pending').length === 0 && (
                    <div className="text-center py-6 text-neutral-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>All access requests approved</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Upcoming Sessions This Week */}
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-neutral-900">This Week's Sessions</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('sessions')}>
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {upcomingSessions.slice(0, 4).map(session => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-teal-700">
                            {session.patientName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{session.patientName}</p>
                          <p className="text-sm text-neutral-500">{formatDate(session.scheduledAt)}</p>
                        </div>
                      </div>
                      {session.hasInsightAccess ? (
                        <Button variant="ghost" size="sm" className="text-teal-600">
                          <Eye className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Lock className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Insight Navigator CTA */}
            <Card className="p-6 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Insight Navigator
                    </h3>
                    <p className="text-neutral-600">
                      Access comprehensive patient profiles - never start from zero.
                      AI-updated, parent-approved living intake documents.
                    </p>
                  </div>
                </div>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  View Patients
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Search & Filters */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                All Patients
                <ChevronRight className="w-4 h-4 ml-1 rotate-90" />
              </Button>
            </div>

            {/* Patient Grid */}
            {filteredPatients.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  {searchQuery ? 'No patients found' : 'No patients yet'}
                </h3>
                <p className="text-neutral-500 max-w-md mx-auto mb-6">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'Share your provider link with families to start building your patient roster. Parents can connect and grant you access to their Insight Navigator profiles.'}
                </p>
                {!searchQuery && (
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Get Your Provider Link
                  </Button>
                )}
              </Card>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredPatients.map(patient => (
                <Card
                  key={patient.id}
                  className={`p-5 hover:shadow-md transition-all cursor-pointer ${
                    patient.profileAccess === 'granted'
                      ? 'border-teal-200/60 hover:border-teal-300/60'
                      : 'border-neutral-200'
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-violet-700">
                          {patient.childName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900">{patient.childName}</h4>
                        <p className="text-sm text-neutral-500">
                          {patient.age} years old • Parent: {patient.parentName}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {patient.conditions.map(condition => (
                            <Badge key={condition} className={getConditionColor(condition)}>
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Badge className={
                      patient.profileAccess === 'granted'
                        ? 'bg-green-100 text-green-700'
                        : patient.profileAccess === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-neutral-100 text-neutral-600'
                    }>
                      {patient.profileAccess === 'granted' && (
                        <><Unlock className="w-3 h-3 mr-1" /> Access</>
                      )}
                      {patient.profileAccess === 'pending' && (
                        <><Clock className="w-3 h-3 mr-1" /> Pending</>
                      )}
                      {patient.profileAccess === 'revoked' && (
                        <><Lock className="w-3 h-3 mr-1" /> Revoked</>
                      )}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <div className="text-sm text-neutral-500">
                      {patient.totalSessions} total sessions
                      {patient.nextSession && (
                        <span className="text-teal-600 ml-2">
                          • Next: {formatDate(patient.nextSession)}
                        </span>
                      )}
                    </div>
                    {patient.profileAccess === 'granted' && (
                      <Button size="sm" variant="ghost" className="text-teal-600">
                        <Eye className="w-4 h-4 mr-1" />
                        Insight Navigator
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">Upcoming Sessions</h2>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Calendar className="w-4 h-4 mr-2" />
                Manage Availability
              </Button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {upcomingSessions.map(session => (
                <Card key={session.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-teal-700">
                          {session.patientName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900">{session.patientName}</h4>
                        <p className="text-sm text-neutral-500">
                          {session.type} • {session.duration} min
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-neutral-600">{formatDate(session.scheduledAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right mr-4">
                        <p className="text-sm text-neutral-500">Starts in</p>
                        <p className="font-semibold text-teal-600">
                          {formatTimeUntil(session.scheduledAt)}
                        </p>
                      </div>

                      {session.hasInsightAccess && (
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Insight
                        </Button>
                      )}
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                        <Video className="w-4 h-4 mr-1" />
                        Join
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {upcomingSessions.length === 0 && (
                <Card className="p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    No upcoming sessions
                  </h3>
                  <p className="text-neutral-500">
                    Your schedule is clear. New bookings will appear here.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai-summaries' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">AI Patient Summaries</h2>
                <p className="text-neutral-500 dark:text-slate-400 mt-1">
                  AI-generated insights for your patients. Submit care plan suggestions that parents can approve.
                </p>
              </div>
            </div>

            {/* Patient selector for AI summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient list sidebar */}
              <Card className="p-4 lg:col-span-1">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Select Patient</h3>
                <div className="space-y-2">
                  {patients
                    .filter(p => p.profileAccess === 'granted')
                    .map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedPatient?.id === patient.id
                            ? 'bg-teal-100 border-teal-300 dark:bg-teal-900/30'
                            : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-slate-800 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-violet-700">
                              {patient.childName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">{patient.childName}</p>
                            <p className="text-sm text-neutral-500 dark:text-slate-400">{patient.age} years old</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  {patients.filter(p => p.profileAccess === 'granted').length === 0 && (
                    <div className="text-center py-8 text-neutral-500">
                      <Lock className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                      <p>No patients with granted access</p>
                      <p className="text-sm mt-1">Request access from patients' parents first</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* AI Summary panel */}
              <div className="lg:col-span-2">
                {selectedPatient && selectedPatient.profileAccess === 'granted' ? (
                  <PatientAISummary
                    patientId={selectedPatient.id}
                    childName={selectedPatient.childName}
                    parentId="parent-123"
                    providerId={providerId}
                  />
                ) : (
                  <Card className="p-12 text-center">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-neutral-200 dark:text-slate-600" />
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                      Select a Patient
                    </h3>
                    <p className="text-neutral-500 dark:text-slate-400 max-w-md mx-auto">
                      Choose a patient from the list to view their AI-generated summary,
                      behavior patterns, progress highlights, and submit care plan suggestions.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">Earnings Overview</h2>
              <Button variant="outline">
                <DollarSign className="w-4 h-4 mr-2" />
                Request Payout
              </Button>
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'This Month', value: `$${earnings.thisMonth.toLocaleString()}`, trend: '+12%', color: 'teal' },
                { label: 'Last Month', value: `$${earnings.lastMonth.toLocaleString()}`, color: 'neutral' },
                { label: 'Pending', value: `$${earnings.pending.toLocaleString()}`, color: 'amber' },
                { label: 'YTD Total', value: `$${earnings.ytd.toLocaleString()}`, trend: '+18%', color: 'green' }
              ].map((stat, i) => (
                <Card key={i} className="p-5">
                  <p className="text-sm text-neutral-500 mb-1">{stat.label}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900">{stat.value}</p>
                    {stat.trend && (
                      <span className={`text-sm font-medium ${stat.color === 'teal' ? 'text-teal-600' : 'text-green-600'}`}>
                        <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Recent Transactions */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Recent Sessions</h3>
              <div className="space-y-3">
                {[
                  { patient: 'Emma Thompson', date: 'Today', type: 'Parent Consultation', amount: 99, status: 'pending' },
                  { patient: 'Liam Chen', date: 'Yesterday', type: 'Follow-up Session', amount: 99, status: 'completed' },
                  { patient: 'Noah Williams', date: 'Jan 8', type: 'Parent Consultation', amount: 99, status: 'completed' },
                  { patient: 'Emma Thompson', date: 'Jan 5', type: 'Assessment', amount: 175, status: 'completed' }
                ].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-teal-700">
                          {tx.patient.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{tx.patient}</p>
                        <p className="text-sm text-neutral-500">{tx.type} • {tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900">${tx.amount}</p>
                      <Badge className={tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-3 sm:space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">Settings</h2>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Profile</h3>
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-semibold">
                  {provider.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{provider.name}</p>
                  <p className="text-neutral-500">{provider.credentials}</p>
                  <Button variant="ghost" size="sm" className="mt-1 text-teal-600 -ml-2">
                    Change photo
                  </Button>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Specialties
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {provider.specialties.map(s => (
                      <Badge key={s} className="bg-teal-100 text-teal-700">{s}</Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="text-teal-600">
                      + Add
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Session Rate
                  </label>
                  <Input defaultValue="$99/session" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Credentials & Verification</h3>
              <p className="text-neutral-600 dark:text-slate-400 mb-4 text-sm">
                Verified credentials build trust with families and enable insurance billing
              </p>
              <CredentialBadge providerId={providerId} showDetails={true} />
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Availability</h3>
              <p className="text-neutral-600 mb-4">
                Set your available hours for patient bookings
              </p>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Manage Calendar
              </Button>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Notifications</h3>
              <div className="space-y-3">
                {[
                  'New booking notifications',
                  'Session reminders (30 min before)',
                  'Profile access requests',
                  'Payment notifications'
                ].map((pref, i) => (
                  <label key={i} className="flex items-center justify-between">
                    <span className="text-neutral-700">{pref}</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500" />
                  </label>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-100 sticky top-0 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                    <span className="text-lg sm:text-xl font-semibold text-violet-700">
                      {selectedPatient.childName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
                      {selectedPatient.childName}
                    </h2>
                    <p className="text-neutral-500">
                      {selectedPatient.age} years old • {selectedPatient.totalSessions} sessions
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                  &times;
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-3 sm:space-y-4 sm:space-y-6">
              {/* Access Status */}
              <div className={`p-4 rounded-xl ${
                selectedPatient.profileAccess === 'granted'
                  ? 'bg-green-50 border border-green-200/60'
                  : 'bg-amber-50 border border-amber-200/60'
              }`}>
                <div className="flex items-center gap-3">
                  {selectedPatient.profileAccess === 'granted' ? (
                    <>
                      <Unlock className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          Insight Navigator Access Granted
                        </p>
                        <p className="text-sm text-green-700">
                          {selectedPatient.parentName} has approved your access to view the full profile
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">
                          Access Pending
                        </p>
                        <p className="text-sm text-amber-700">
                          Waiting for {selectedPatient.parentName} to approve profile access
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Conditions */}
              <div>
                <h3 className="font-medium text-neutral-900 mb-2">Conditions</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.conditions.map(condition => (
                    <Badge key={condition} className={getConditionColor(condition)}>
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Session History */}
              <div>
                <h3 className="font-medium text-neutral-900 mb-2">Session History</h3>
                <p className="text-neutral-600">
                  {selectedPatient.totalSessions} sessions completed
                </p>
                {selectedPatient.lastSessionNotes && (
                  <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-neutral-500 mb-1">Last session notes:</p>
                    <p className="text-neutral-700">{selectedPatient.lastSessionNotes}</p>
                  </div>
                )}
              </div>

              {/* Next Session */}
              {selectedPatient.nextSession && (
                <div>
                  <h3 className="font-medium text-neutral-900 mb-2">Next Session</h3>
                  <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    <span className="text-teal-800">
                      {formatDate(selectedPatient.nextSession)}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-100">
                {selectedPatient.profileAccess === 'granted' && (
                  <Button className="flex-1 bg-teal-600 hover:bg-teal-700">
                    <Eye className="w-4 h-4 mr-2" />
                    Open Insight Navigator
                  </Button>
                )}
                <Button variant="outline" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  Session Notes
                </Button>
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ProviderPortal;
