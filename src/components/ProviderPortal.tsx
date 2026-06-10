// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

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
import { toast } from 'sonner';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ProviderCredentialingWidget } from './ProviderCredentialingWidget';
import { isDemoMode } from '../lib/demo-seed';
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
  ShieldCheck,
  UserCheck,
  Play,
  Pause,
  ExternalLink,
  Loader2,
  RefreshCw,
  Plus,
  Save,
  X,
  Briefcase,
  Download,
  Printer,
  CreditCard
} from 'lucide-react';
import type { ProviderType } from '../lib/child-profiles';
import { brandColors } from '../lib/brand-system';
import { supabase } from '../utils/supabase/client';
import { CredentialBadge, VerifiedBadge } from './provider/CredentialBadge';
import { getBranding, saveBranding, type ProviderBranding } from '../lib/provider-branding';
import { CPT_CODES, getCPTByCode, suggestCPTCodes, validateNoteForCPT, type CPTCode } from '../lib/cpt-codes';
import { PatientAISummary } from './provider/PatientAISummary';
import { CRSyncStatus } from './CRSyncStatus';
import { summarizePractice, resolvePracticeMode, type ProviderPracticeMode } from '../lib/provider-practice';
import { getPlatformFeeRate } from '../lib/stripe-connect';
import { listClaimReadyCases, summarizeClaimReadyQueue, type ClaimReadyCase } from '../lib/claim-ready-queue';
import { getStateMarketCoverage, isSupportedProviderState } from '../lib/insurance/state-market-coverage';
import { ProviderInsightsDashboard } from './provider/ProviderInsightsDashboard';
import { CareCoordination } from './provider/CareCoordination';
import { RBTManagement } from './provider/RBTManagement';
import RosterManager from './provider/RosterManager';
import { RBTSessionLog } from './provider/RBTSessionLog';
import { SupervisionDashboard } from './provider/SupervisionDashboard';
import { ProviderPerformanceTab } from './provider/ProviderPerformanceTab';
import { TelehealthSessionEngine } from './provider/TelehealthSessionEngine';
import CredentialingOrchestrator from './provider/CredentialingOrchestrator';
import ClaimReadyQueue from './provider/ClaimReadyQueue';
import { GroupSessionCreator } from './provider/GroupSessionCreator';
import {
  generateSuperbillFromSession,
  saveSuperbillToSupabase,
  type SessionForSuperbill,
  type ClinicalNoteForSuperbill,
  type ProviderForSuperbill,
} from '../lib/superbill-service';
import type { Superbill } from '../types/telehealth';

// Lazy-load the SuperbillGenerator for the provider-side superbill overlay
const SuperbillGenerator = React.lazy(() => import('./SuperbillGenerator'));

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
  firstContactDate?: string;
  firstSessionDate?: string;
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
  organization?: string;
  licensedStates: string[];
  acceptedInsurance: string[];
  acceptsInsurance?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'manual_review' | 'expired' | 'failed';
  needsSetup?: boolean;
}

interface ProviderPortalProps {
  providerId: string;
  onNavigate?: (screen: string) => void;
  /** Launches the live telehealth room. App.tsx sets the active session id then routes to video-call-room. */
  onStartTelehealthSession?: (sessionId: string) => void;
}

export function ProviderPortal({ providerId, onNavigate, onStartTelehealthSession }: ProviderPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'sessions' | 'start-session' | 'earnings' | 'settings' | 'ai-summaries' | 'insights' | 'coordination' | 'my-practice' | 'clinical-notes' | 'supervision' | 'credentialing' | 'claims' | 'performance'>('dashboard');
  // Partner attribution drives which tabs show. AACT providers don't manage their
  // own credentialing or claims (the org handles that). Cash-pay providers don't see
  // insurance/claims tabs. This keeps the EMR surface scoped to what's actually relevant.
  const [partnerOrg, setPartnerOrg] = useState<'aact' | 'rise' | 'unknown'>('unknown');
  // Owner-facing practice posture: own independent practice vs. org caseload.
  // Defaults to 'independent' (the practice-in-a-box wedge); org-affiliated
  // providers (AACT/Rise) fall back to 'org' framing when no explicit choice is stored.
  const [practiceMode, setPracticeMode] = useState<ProviderPracticeMode>('independent');
  useEffect(() => {
    (async () => {
      // pilot_organization is a known column (Arizona pilot migration). practice_mode
      // may not exist in every deployed schema yet, so query it separately and tolerate
      // its absence — a failed practice_mode read must not drop partner attribution.
      const { data } = await supabase
        .from('profiles')
        .select('pilot_organization')
        .eq('id', providerId)
        .maybeSingle();
      const org = data?.pilot_organization;
      const affiliatedOrg = org === 'aact' || org === 'rise';
      if (org === 'aact' || org === 'rise') setPartnerOrg(org);

      let storedMode: string | null = null;
      try {
        const { data: modeRow } = await supabase
          .from('profiles')
          .select('practice_mode')
          .eq('id', providerId)
          .maybeSingle();
        storedMode = (modeRow as { practice_mode?: string } | null)?.practice_mode ?? null;
      } catch {
        // practice_mode column not present — fall back to affiliation-based default.
      }
      setPracticeMode(resolvePracticeMode(storedMode, { affiliatedOrg }));
    })();
  }, [providerId]);
  // Sub-view within the "My Practice" hub so the BCBA can move coherently
  // through: practice overview → their roster → their RBTs → review RBT sessions.
  const [practiceView, setPracticeView] = useState<'overview' | 'roster' | 'rbts' | 'sessions'>('overview');
  const isOrgCaseload = practiceMode === 'org';
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
  // Clinical notes tab state — discipline-specific note templates
  type NoteType = 'soap' | 'aba-session' | 'progress' | 'slp-session' | 'mental-health' | 'diagnostic-eval' | 'dev-ped';
  const NOTE_TEMPLATES: Record<NoteType, { label: string; badge: string; badgeClass: string; fields: Array<{ key: string; label: string; placeholder: string; rows?: number }> }> = {
    'soap': {
      label: 'SOAP Note', badge: 'SOAP', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      fields: [
        { key: 'subjective', label: 'S — Subjective', placeholder: "Parent/caregiver reports, child's statements, behavioral observations..." },
        { key: 'objective', label: 'O — Objective', placeholder: 'Measurable data, session metrics, standardized scores...' },
        { key: 'assessment', label: 'A — Assessment', placeholder: 'Clinical interpretation, progress toward goals, barriers...' },
        { key: 'plan', label: 'P — Plan', placeholder: 'Next steps, goal modifications, recommendations...' },
      ],
    },
    'aba-session': {
      label: 'ABA Session Note', badge: 'ABA', badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
      fields: [
        { key: 'targets', label: 'Targets Addressed', placeholder: 'List skill acquisition and behavior reduction targets...' },
        { key: 'trials', label: 'Trials / Data', placeholder: 'Trial counts, correct/incorrect, percentage mastery...' },
        { key: 'prompting', label: 'Prompting Levels', placeholder: 'Full physical, partial physical, model, gestural, independent...' },
        { key: 'data', label: 'Session Summary', placeholder: 'Overall session behavior, reinforcement used, notable events...' },
      ],
    },
    'slp-session': {
      label: 'SLP Session Note', badge: 'SLP', badgeClass: 'bg-[#6B9080]/10 text-[#6B9080] dark:bg-[#6B9080]/15 dark:text-[#7BA7BC]',
      fields: [
        { key: 'articulation', label: 'Articulation / Phonology', placeholder: 'Phoneme targets (e.g., /r/, /s/ blends), % accuracy, error patterns...' },
        { key: 'language', label: 'Receptive / Expressive Language', placeholder: 'Language sample, MLU, following directions, vocabulary targets...' },
        { key: 'fluency_voice', label: 'Fluency / Voice / AAC', placeholder: 'Dysfluency counts, vocal quality, AAC device trials, pragmatics...' },
        { key: 'oral_motor', label: 'Oral Motor / Feeding', placeholder: 'Oral motor exercises, feeding observations, sensory responses...' },
        { key: 'plan', label: 'Plan / Homework', placeholder: 'Home practice activities, next session targets, parent carryover instructions...' },
      ],
    },
    'mental-health': {
      label: 'Mental Health Note', badge: 'MH', badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
      fields: [
        { key: 'presenting', label: 'Presenting Concerns', placeholder: 'Current symptoms, triggers, mood, sleep, appetite...' },
        { key: 'risk_assessment', label: 'Safety / Risk Assessment', placeholder: 'SI/HI screening, self-harm, risk level, protective factors...' },
        { key: 'intervention', label: 'Therapeutic Intervention', placeholder: 'Modality used (CBT, DBT, play therapy), techniques, child response...' },
        { key: 'standardized', label: 'Standardized Measures', placeholder: 'PHQ-A, GAD-7, SCARED, RCADS scores if administered...' },
        { key: 'progress', label: 'Treatment Plan Progress', placeholder: 'Progress toward treatment goals, barriers, caregiver involvement...' },
        { key: 'plan', label: 'Plan', placeholder: 'Next session focus, homework, medication coordination, referrals...' },
      ],
    },
    'diagnostic-eval': {
      label: 'Diagnostic Evaluation', badge: 'EVAL', badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      fields: [
        { key: 'reason', label: 'Reason for Referral', placeholder: 'Referral source, presenting concerns, specific diagnostic questions...' },
        { key: 'history', label: 'Developmental / Medical History', placeholder: 'Milestones, prenatal/birth, medical conditions, prior diagnoses, medications...' },
        { key: 'battery', label: 'Test Battery Administered', placeholder: 'ADOS-2, WISC-V, Vineland-3, BASC-3, Conners-4, BRIEF-2...' },
        { key: 'behavioral_obs', label: 'Behavioral Observations', placeholder: 'Engagement, attention, communication style, affect, motor, sensory...' },
        { key: 'scores', label: 'Results / Scores', placeholder: 'Standard scores, percentiles, composite indices, clinically significant findings...', rows: 4 },
        { key: 'impressions', label: 'Diagnostic Impressions', placeholder: 'DSM-5 codes, differential diagnosis, clinical rationale...' },
        { key: 'recommendations', label: 'Recommendations', placeholder: 'Recommended services, school accommodations, follow-up, referrals...' },
      ],
    },
    'dev-ped': {
      label: 'Developmental Pediatrics', badge: 'DEV PED', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      fields: [
        { key: 'chief_complaint', label: 'Chief Complaint', placeholder: 'Primary concern, duration, changes since last visit...' },
        { key: 'milestones', label: 'Developmental Milestones', placeholder: 'Gross motor, fine motor, speech/language, social/emotional, cognitive status...' },
        { key: 'exam', label: 'Physical / Neuro Exam', placeholder: 'Growth parameters, neurological findings, dysmorphic features, sensory...' },
        { key: 'medications', label: 'Medication Review', placeholder: 'Current medications, dosage, side effects, efficacy, adjustments...' },
        { key: 'assessment', label: 'Assessment', placeholder: 'Diagnostic updates, comorbidities, functional impact...' },
        { key: 'coordination', label: 'Care Coordination / Plan', placeholder: 'Therapy referrals, school letter, follow-up schedule, lab orders...' },
      ],
    },
    'progress': {
      label: 'Progress Note', badge: 'Progress', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      fields: [
        { key: 'narrative', label: 'Narrative', placeholder: "Describe the client's progress, behavioral changes, milestones, and next steps...", rows: 6 },
      ],
    },
  };

  const [clinicalNotes, setClinicalNotes] = useState<Array<{
    id: string;
    patientName: string;
    noteType: NoteType;
    date: string;
    content: Record<string, string>;
    signed: boolean;
    locked: boolean;
    cptCode?: string;
  }>>([]);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<{
    noteType: NoteType;
    patientId: string;
    patientName: string;
    sessionId?: string;
    content: Record<string, string>;
    cptCode?: string;
  } | null>(null);
  const [earnings, setEarnings] = useState<{ thisMonth: number; lastMonth: number; pending: number; ytd: number }>({
    thisMonth: 0, lastMonth: 0, pending: 0, ytd: 0
  });
  // White-label branding
  const [branding, setBranding] = useState<ProviderBranding | null>(() => getBranding());
  const practiceSummary = provider ? summarizePractice({
    providerId: provider.id,
    providerName: provider.name,
    businessModel: (branding?.orgName && /aact|rise/i.test(branding.orgName)) || (provider.organization && /aact|rise/i.test(provider.organization))
      ? 'partner_clinic'
      : provider.acceptsInsurance
        ? 'hybrid'
        : 'independent_network',
    practiceMode,
    organization: branding?.orgName || provider.organization || 'Independent Provider',
    licensedStates: provider.licensedStates,
    careRails: provider.acceptsInsurance ? ['cash_pay_direct', 'insured_partner_billed'] : ['cash_pay_direct'],
    acceptedInsurance: provider.acceptedInsurance.length ? provider.acceptedInsurance : ['Cash Pay'],
    whiteLabelEnabled: Boolean(branding?.orgName),
    telehealthEnabled: true,
    practiceName: branding?.orgName || `${provider.name} Practice`,
    verificationStatus: provider.verificationStatus,
  }, sessions.filter((session) => session.status === 'upcoming').length) : null;
  const primaryPracticeState = provider?.licensedStates.find((state) => isSupportedProviderState(state));
  const practiceMarketCoverage = primaryPracticeState ? getStateMarketCoverage(primaryPracticeState) : null;
  const [practiceClaimQueue, setPracticeClaimQueue] = useState<ClaimReadyCase[]>([]);
  const practiceClaimQueueSummary = summarizeClaimReadyQueue(practiceClaimQueue);
  const [brandingForm, setBrandingForm] = useState({ orgName: '', logoUrl: '', primaryColor: '', tagline: '' });

  // Superbill generation state
  const [showSuperbillGenerator, setShowSuperbillGenerator] = useState(false);
  const [generatedSuperbill, setGeneratedSuperbill] = useState<Superbill | null>(null);
  const [superbillToast, setSuperbillToast] = useState<string | null>(null);
  const [lastSavedNoteId, setLastSavedNoteId] = useState<string | null>(null);

  // Provider notification system — real items requiring action
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingBCBAThreads, setPendingBCBAThreads] = useState<Array<{
    id: string;
    question: string;
    parent_name: string | null;
    child_name: string | null;
    created_at: string;
    status: string;
  }>>([]);
  const [unsignedNoteCount, setUnsignedNoteCount] = useState(0);

  const notificationCount = pendingBCBAThreads.length + unsignedNoteCount;

  const loadProviderNotifications = useCallback(async () => {
    // Pending BCBA threads waiting for clinician review
    const { data: threads } = await supabase
      .from('ask_bcba_threads')
      .select('id, question, parent_name, child_name, created_at, status')
      .in('status', ['ai_drafted', 'awaiting_bcba'])
      .order('created_at', { ascending: true })
      .limit(20);
    if (threads) setPendingBCBAThreads(threads);

    // Unsigned notes for this provider
    const { count } = await supabase
      .from('session_notes')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('signed', false);
    setUnsignedNoteCount(count || 0);
  }, [providerId]);

  // Load provider data from Supabase
  const loadProviderData = useCallback(async () => {
    setIsRefreshing(true);
    if (import.meta.env.DEV) console.log('[ProviderPortal] Loading data for provider:', providerId);

    // Dev-mode fast-fail: if the provider ID is a synthetic dev ID, OR if this is
    // an E2E test run (__e2e_auth='bypass'), skip DB and render immediately so
    // audit/E2E tests don't hang on network timeouts regardless of providerId value.
    const isE2EBypass = import.meta.env.DEV &&
      (() => { try { return localStorage.getItem('__e2e_auth') === 'bypass'; } catch { return false; } })();
    if (import.meta.env.DEV && (providerId.startsWith('dev-') || isE2EBypass)) {
      setProvider({
        id: providerId || 'dev-provider-test',
        name: 'Dev Provider',
        credentials: 'BCBA-D',
        type: 'bcba',
        specialties: ['ABA Therapy', 'Behavior Analysis'],
        rating: 4.9,
        reviewCount: 12,
        totalPatients: 3,
        sessionsThisMonth: 5,
        earningsThisMonth: 2400,
        organization: 'Independent Provider',
        licensedStates: ['AZ'],
        acceptedInsurance: ['AHCCCS', 'BCBS', 'Cash Pay'],
        acceptsInsurance: true,
        verificationStatus: 'verified',
      });
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // Fetch provider profile
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', providerId)
        .single();

      if (providerError && providerError.code !== 'PGRST116') {
        console.error('[ProviderPortal] Error fetching provider:', providerError.message);
      }

      // If no provider found in DB, use fallback mock data for demo
      if (providerData) {
        const providerName = providerData.name || [providerData.first_name, providerData.last_name].filter(Boolean).join(' ') || 'Provider';
        setProvider({
          id: providerData.id,
          name: providerName,
          credentials: providerData.credentials,
          type: providerData.provider_type as ProviderType,
          photo: providerData.photo_url,
          specialties: providerData.specialties || [],
          rating: providerData.rating || 0,
          reviewCount: providerData.review_count || 0,
          totalPatients: 0, // Will be calculated from patients
          sessionsThisMonth: 0,
          earningsThisMonth: 0,
          organization: providerData.organization || 'Independent Provider',
          licensedStates: providerData.states_licensed || [],
          acceptedInsurance: providerData.insurance_accepted || ['Cash Pay'],
          acceptsInsurance: providerData.accepts_insurance || false,
          verificationStatus: providerData.verification_status || (providerData.verified ? 'verified' : 'pending'),
        });
      } else {
        // No provider profile found - show setup prompt
        setProvider({
          id: providerId,
          name: 'Complete Your Profile',
          credentials: '',
          type: 'bcba',
          specialties: [],
          rating: 0,
          reviewCount: 0,
          totalPatients: 0,
          sessionsThisMonth: 0,
          earningsThisMonth: 0,
          organization: 'Independent Provider',
          licensedStates: [],
          acceptedInsurance: ['Cash Pay'],
          acceptsInsurance: false,
          verificationStatus: 'pending',
          needsSetup: true,
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
        console.error('[ProviderPortal] Error fetching patients:', patientsError.message);
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

      // Set patients - empty list if no patients found (no demo data)
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
        console.error('[ProviderPortal] Error fetching sessions:', sessionsError.message);
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

      // Sample sessions — DEMO MODE ONLY. Real providers with no sessions see
      // the existing empty state, never fabricated patients.
      if (sessionsList.length === 0 && isDemoMode()) {
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

      // Hoisted so the provider-stats update below can use the freshly computed
      // monthly total instead of the not-yet-committed `earnings` state.
      let computedThisMonth = 0;
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

        computedThisMonth = Math.round(thisMonth / 100);
        setEarnings({
          thisMonth: computedThisMonth,
          lastMonth: Math.round(lastMonth / 100),
          pending: Math.round(pending / 100),
          ytd: Math.round(ytd / 100),
        });
      } else {
        // No earnings data - show zeros
        setEarnings({ thisMonth: 0, lastMonth: 0, pending: 0, ytd: 0 });
      }

      // Update provider stats using the locally-computed monthly total.
      setProvider(prev => prev ? {
        ...prev,
        totalPatients: patientsList.length,
        sessionsThisMonth: sessionsData?.length || sessionsList.length,
        earningsThisMonth: computedThisMonth,
      } : null);

    } catch (error) {
      console.error('[ProviderPortal] Error loading data:', error);
      // Ensure provider is set so the loading gate doesn't block the UI on network errors
      setProvider(prev => prev || {
        id: providerId,
        name: 'Provider',
        credentials: '',
        type: 'bcba',
        specialties: [],
        rating: 0,
        reviewCount: 0,
        totalPatients: 0,
        sessionsThisMonth: 0,
        earningsThisMonth: 0,
        organization: 'Independent Provider',
        licensedStates: [],
        acceptedInsurance: ['Cash Pay'],
        acceptsInsurance: false,
        verificationStatus: 'pending',
        needsSetup: true,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadProviderData();
    loadProviderNotifications();
  }, [loadProviderData, loadProviderNotifications]);

  useEffect(() => {
    let cancelled = false;

    async function loadPracticeClaimQueue() {
      if (!primaryPracticeState) {
        setPracticeClaimQueue([]);
        return;
      }

      const queue = await listClaimReadyCases(primaryPracticeState);
      if (!cancelled) {
        setPracticeClaimQueue(queue);
      }
    }

    loadPracticeClaimQueue();
    return () => {
      cancelled = true;
    };
  }, [primaryPracticeState]);

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

  // Clinical notes handlers
  const handleSaveClinicalNote = async () => {
    if (!editingNote) return;
    setIsSavingNotes(true);
    try {
      const noteId = `note-${Date.now()}`;
      const newNote = {
        id: noteId,
        patientName: editingNote.patientName,
        noteType: editingNote.noteType,
        date: new Date().toISOString().split('T')[0],
        content: editingNote.content,
        signed: false,
        locked: false,
      };

      // Save to Supabase
      const { error } = await supabase.from('session_notes').insert({
        session_id: editingNote.sessionId || noteId,
        provider_id: providerId,
        note_type: editingNote.noteType,
        subjective: editingNote.content.subjective || editingNote.content.narrative || null,
        objective: editingNote.content.objective || editingNote.content.targets || null,
        assessment: editingNote.content.assessment || editingNote.content.data || null,
        plan: editingNote.content.plan || editingNote.content.prompting || null,
        shared_with_parent: false,
      });

      if (error) console.warn('[ProviderPortal] Supabase save error (using local):', error);

      setClinicalNotes(prev => [newNote, ...prev]);
      setLastSavedNoteId(noteId);
      setEditingNote(null);
      setShowNoteEditor(false);
    } catch (err) {
      console.error('[ProviderPortal] Error saving clinical note:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Superbill generation handler
  const handleGenerateSuperbill = (noteId: string) => {
    const note = clinicalNotes.find(n => n.id === noteId);
    if (!note || !provider) return;

    // Find the session associated with this note (if any)
    const linkedSession = sessions.find(s =>
      s.patientName === note.patientName && s.status !== 'cancelled'
    );

    // Build the session object for the superbill service
    const sessionData: SessionForSuperbill = linkedSession
      ? {
          id: linkedSession.id,
          patientId: linkedSession.patientId,
          patientName: linkedSession.patientName,
          scheduledAt: linkedSession.scheduledAt,
          duration: linkedSession.duration,
          type: linkedSession.type,
          status: linkedSession.status,
        }
      : {
          id: noteId,
          patientId: note.patientName.replace(/\s+/g, '-').toLowerCase(),
          patientName: note.patientName,
          scheduledAt: new Date(note.date),
          duration: 50, // default session length
          type: 'Follow-up Session',
          status: 'completed',
        };

    // Build the clinical note object
    const clinicalNoteData: ClinicalNoteForSuperbill = {
      noteType: note.noteType,
      content: note.content,
      cptCode: note.cptCode,
      patientName: note.patientName,
      sessionId: linkedSession?.id,
    };

    // Build the provider object
    const providerData: ProviderForSuperbill = {
      id: provider.id,
      name: provider.name,
      credentials: provider.credentials,
      type: provider.type,
    };

    // Generate the superbill
    const superbill = generateSuperbillFromSession(sessionData, clinicalNoteData, providerData);
    setGeneratedSuperbill(superbill);
    setShowSuperbillGenerator(true);
    setLastSavedNoteId(null);

    // Persist to Supabase (fire-and-forget with toast)
    saveSuperbillToSupabase(superbill).then(savedId => {
      if (savedId) {
        setSuperbillToast('Superbill generated and saved successfully');
      } else {
        setSuperbillToast('Superbill generated (saved locally — sync pending)');
      }
      setTimeout(() => setSuperbillToast(null), 4000);
    });
  };

  const handleSignLockNote = (noteId: string) => {
    setClinicalNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, signed: true, locked: true } : n
    ));
  };

  const handleExportNotePDF = (noteId: string) => {
    const note = clinicalNotes.find(n => n.id === noteId);
    if (!note) return;

    // Build plain text for PDF
    const lines: string[] = [
      `Clinical Note — ${note.noteType.toUpperCase()}`,
      `Patient: ${note.patientName}`,
      `Date: ${note.date}`,
      `Provider: ${provider?.name || providerId}`,
      '',
    ];

    // Template-driven export — works for all disciplines
    const tmpl = NOTE_TEMPLATES[note.noteType];
    tmpl.fields.forEach(f => {
      lines.push(`${f.label.toUpperCase()}:`, note.content[f.key] || '—', '');
    });

    if (note.signed) lines.push('', `Signed & Locked: ${note.date}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-note-${note.patientName.replace(/\s/g, '-')}-${note.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    if (condition.includes('Autism')) return 'bg-[#6B9080]/10 text-[#6B9080]';
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
          <div className="w-12 h-12 border-4 border-[#6B9080]/20 border-t-[#6B9080] rounded-full animate-spin mx-auto mb-4" />
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
              {branding?.orgName ? (
                <>
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.orgName} className="w-8 h-8 rounded-lg object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: branding.primaryColor || '#6B9080' }}>
                      {branding.orgName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-[#1B2733] dark:text-white">{branding.orgName}</span>
                      <Badge className="bg-[#6B9080]/10 text-[#6B9080] dark:bg-[#6B9080]/15 dark:text-primary font-medium">
                        {provider.credentials}
                      </Badge>
                    </div>
                    <span className="text-xs text-neutral-400 dark:text-[#5A6B7A] -mt-0.5">powered by Aminy</span>
                  </div>
                </>
              ) : (
                <>
                  <Logo size="sm" showText={false} />
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-[#1B2733] dark:text-white">Provider Portal</span>
                    <Badge className="bg-[#6B9080]/10 text-[#6B9080] dark:bg-[#6B9080]/15 dark:text-primary font-medium">
                      {provider.credentials}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadProviderData()}
                disabled={isRefreshing}
                aria-label="Refresh provider dashboard"
                className="border-[#E8E4DF] bg-white text-neutral-600 hover:border-[#6B9080]/20 hover:bg-[#6B9080]/10 hover:text-[#6B9080]"
              >
                <RefreshCw className={`w-5 h-5 text-neutral-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="relative border-[#E8E4DF] bg-white text-neutral-600 hover:border-[#6B9080]/20 hover:bg-[#6B9080]/10 hover:text-[#6B9080]"
                  aria-label="Notifications"
                  onClick={() => {
                    setShowNotifications(v => !v);
                    if (!showNotifications) loadProviderNotifications();
                  }}
                >
                  <Bell className="w-5 h-5 text-neutral-600 dark:text-slate-400" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white border border-[#E8E4DF] rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-[#E8E4DF] flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#1B2733]">Action required</p>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationCount === 0 ? (
                        <div className="p-6 text-center">
                          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-[#5A6B7A]">All caught up!</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#F0EDE8]">
                          {unsignedNoteCount > 0 && (
                            <button
                              className="w-full text-left p-3 hover:bg-[#FAF7F2] transition-colors"
                              onClick={() => { setActiveTab('clinical-notes'); setShowNotifications(false); }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[#1B2733]">{unsignedNoteCount} unsigned note{unsignedNoteCount > 1 ? 's' : ''}</p>
                                  <p className="text-xs text-[#5A6B7A]">Sign to submit for billing</p>
                                </div>
                              </div>
                            </button>
                          )}
                          {pendingBCBAThreads.slice(0, 5).map(thread => (
                            <button
                              key={thread.id}
                              className="w-full text-left p-3 hover:bg-[#FAF7F2] transition-colors"
                              onClick={() => { setActiveTab('ai-summaries'); setShowNotifications(false); }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-[#6B9080]/10 flex items-center justify-center shrink-0">
                                  <MessageSquare className="w-4 h-4 text-[#6B9080]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#1B2733]">Family Q awaiting review</p>
                                  <p className="text-xs text-[#5A6B7A] truncate">{thread.question}</p>
                                  {thread.child_name && <p className="text-xs text-[#5A6B7A]">Re: {thread.child_name}</p>}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {notificationCount > 0 && (
                      <div className="p-3 border-t border-[#E8E4DF]">
                        <button
                          className="w-full text-center text-xs text-[#6B9080] font-medium"
                          onClick={() => { setActiveTab('ai-summaries'); setShowNotifications(false); }}
                        >
                          View all pending reviews →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white font-semibold">
                  {provider.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#1B2733] dark:text-white">{provider.name}</p>
                    {provider.verificationStatus && (
                      <VerifiedBadge status={provider.verificationStatus} />
                    )}
                  </div>
                  <p className="text-xs text-[#5A6B7A] dark:text-slate-400">{provider.credentials}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-neutral-100 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'clients', label: 'Clients', icon: Users },
              { id: 'insights', label: 'Insights', icon: BarChart3 },
              { id: 'ai-summaries', label: 'AI Summaries', icon: Brain },
              { id: 'coordination', label: 'Care Team', icon: Heart },
              { id: 'sessions', label: 'Sessions', icon: Calendar },
              { id: 'start-session', label: 'Start Session', icon: Video },
              { id: 'earnings', label: 'Earnings', icon: DollarSign },
              { id: 'clinical-notes', label: 'Notes', icon: ClipboardList },
              { id: 'supervision', label: 'Supervision', icon: UserCheck },
              { id: 'credentialing', label: 'Credentialing', icon: ShieldCheck },
              { id: 'claims', label: 'Claims', icon: FileText },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'my-practice', label: 'My Practice', icon: Briefcase },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].filter(tab => {
              // AACT/Rise providers don't manage their own credentialing or claims
              // — the partner organization handles those upstream.
              if (partnerOrg === 'aact' || partnerOrg === 'rise') {
                return tab.id !== 'credentialing' && tab.id !== 'claims';
              }
              // Cash-pay (unknown partner) providers don't deal with insurance claims.
              if (partnerOrg === 'unknown') {
                return tab.id !== 'claims';
              }
              return true;
            }).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#6B9080] bg-white text-[#6B9080] shadow-sm'
                    : 'border-[#E8E4DF] bg-transparent text-neutral-600 hover:border-[#6B9080]/20 hover:bg-white hover:text-neutral-800'
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
          <div className="space-y-6">
            {/* Verification widget — hides when fully verified */}
            <ProviderCredentialingWidget providerId={providerId} />

            {/* Welcome & Next Session */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
              {/* Welcome Card */}
              <Card className="lg:col-span-2 overflow-hidden border-[#6B9080]/20/60 bg-gradient-to-br from-[#FAF7F2] via-white to-[#FAF7F2] p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6B9080]">
                      Independent practice cockpit
                    </p>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#1B2733]">
                      Welcome back, {provider.name.split(' ')[0]}
                    </h1>
                    <h2 className="sr-only">Practice overview</h2>
                    <h3 className="sr-only">Bookings, claims, and family follow-up</h3>
                    <p className="text-neutral-600 mt-1">
                      Keep bookings, claim-ready work, and family follow-up moving from one calmer workflow.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-white/80 rounded-lg px-3 py-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-[#1B2733]">{provider.rating}</span>
                    <span className="text-[#5A6B7A] text-sm">({provider.reviewCount})</span>
                  </div>
                </div>

                {nextSession && (
                  <div className="mt-4 sm:mt-6 rounded-2xl border border-[#6B9080]/20/60 bg-white/95 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                          <span className="text-lg font-semibold text-violet-700">
                            {nextSession.patientName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-[#1B2733]">
                            {nextSession.patientName}
                          </p>
                          <p className="text-sm text-[#5A6B7A]">
                            {nextSession.type} with {nextSession.parentName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-[#6B9080]">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">
                            in {formatTimeUntil(nextSession.scheduledAt)}
                          </span>
                        </div>
                        <p className="text-sm text-[#5A6B7A]">
                          {nextSession.duration} min session
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button
                        className="flex-1 bg-primary hover:bg-[#216982]"
                        onClick={() => {
                          if (onStartTelehealthSession) {
                            onStartTelehealthSession(nextSession.id);
                          } else {
                            setActiveTab('start-session');
                          }
                        }}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Start Session
                      </Button>
                      {nextSession.hasInsightAccess && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            const patient = patients.find(p => p.id === nextSession.patientId);
                            if (patient) {
                              setSelectedPatient(patient);
                            } else {
                              onNavigate?.('insight-report');
                            }
                          }}
                        >
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
                <h3 className="font-semibold text-[#1B2733] mb-4">This Month</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-neutral-600">Active Clients</span>
                    </div>
                    <span className="text-xl font-bold text-[#1B2733]">{provider.totalPatients}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-violet-600" />
                      </div>
                      <span className="text-neutral-600">Sessions</span>
                    </div>
                    <span className="text-xl font-bold text-[#1B2733]">{provider.sessionsThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-neutral-600">Earnings</span>
                    </div>
                    <span className="text-xl font-bold text-[#1B2733]">
                      ${provider.earningsThisMonth.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* CentralReach Sync Status */}
            <CRSyncStatus userId="current-user" compact={false} />

            {/* Quick Access - Patients Needing Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
              {/* Pending Profile Access */}
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#1B2733]">Pending Profile Access</h3>
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
                            <p className="font-medium text-[#1B2733]">{patient.childName}</p>
                            <p className="text-sm text-[#5A6B7A]">
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
                    <div className="text-center py-6 text-[#5A6B7A]">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>All access requests approved</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Upcoming Sessions This Week */}
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#1B2733]">This Week's Sessions</h3>
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
                          <span className="text-sm font-semibold text-[#6B9080]">
                            {session.patientName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#1B2733]">{session.patientName}</p>
                          <p className="text-sm text-[#5A6B7A]">{formatDate(session.scheduledAt)}</p>
                        </div>
                      </div>
                      {session.hasInsightAccess ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-[#6B9080]"
                          aria-label={`View insight profile for ${session.patientName}`}
                        >
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

            {/* Async Review Queue — family questions + unsigned notes needing action */}
            {notificationCount > 0 && (
              <Card className="p-4 sm:p-5 border-amber-200 bg-amber-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-900">Action Required ({notificationCount})</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-700 hover:bg-amber-100"
                    onClick={() => setActiveTab('ai-summaries')}
                  >
                    Review all
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {unsignedNoteCount > 0 && (
                    <button
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 hover:border-amber-400 transition-colors text-left"
                      onClick={() => setActiveTab('clinical-notes')}
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1B2733]">{unsignedNoteCount} note{unsignedNoteCount > 1 ? 's' : ''} need your signature</p>
                        <p className="text-xs text-[#5A6B7A]">Sign to unlock billing & share with families</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                    </button>
                  )}
                  {pendingBCBAThreads.slice(0, 3).map(thread => (
                    <button
                      key={thread.id}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 hover:border-amber-400 transition-colors text-left"
                      onClick={() => setActiveTab('ai-summaries')}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#6B9080]/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-[#6B9080]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1B2733]">
                          {thread.child_name ? `${thread.child_name}'s family` : thread.parent_name || 'Family'} has a question
                        </p>
                        <p className="text-xs text-[#5A6B7A] truncate">{thread.question}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Insight Navigator CTA */}
            <Card className="p-6 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1B2733]">
                      Insight Navigator
                    </h3>
                    <p className="text-neutral-600">
                      Access comprehensive patient profiles - never start from zero.
                      AI-updated, parent-approved living intake documents.
                    </p>
                  </div>
                </div>
                <Button className="bg-primary hover:bg-[#216982]">
                  <Sparkles className="w-4 h-4 mr-2" />
                  View Patients
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Search & Filters */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input
                  placeholder="Search Clients..."
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

            {/* Intake Pipeline Stats — first-call-to-first-appointment tracking */}
            {patients.length > 0 && (() => {
              const pendingIntake = patients.filter(p => p.totalSessions === 0 && p.profileAccess === 'granted');
              const withTiming = patients.filter(p => p.firstContactDate && p.firstSessionDate);
              const avgDays = withTiming.length > 0
                ? Math.round(withTiming.reduce((sum, p) => {
                    const diff = new Date(p.firstSessionDate!).getTime() - new Date(p.firstContactDate!).getTime();
                    return sum + diff / (1000 * 60 * 60 * 24);
                  }, 0) / withTiming.length)
                : null;
              const atRisk = pendingIntake.filter(p => {
                if (!p.firstContactDate) return false;
                const daysSinceContact = (Date.now() - new Date(p.firstContactDate).getTime()) / (1000 * 60 * 60 * 24);
                return daysSinceContact > 2;
              });
              if (pendingIntake.length === 0 && avgDays === null) return null;
              return (
                <div className="grid grid-cols-3 gap-3 p-4 bg-[#FAF7F2] rounded-xl border border-[#E8E4DF]">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#1B2733]">{pendingIntake.length}</p>
                    <p className="text-xs text-[#5A6B7A] mt-0.5">Pending first session</p>
                  </div>
                  <div className="text-center border-x border-[#E8E4DF]">
                    <p className="text-2xl font-bold text-[#1B2733]">{avgDays !== null ? `${avgDays}d` : '—'}</p>
                    <p className="text-xs text-[#5A6B7A] mt-0.5">Avg. days to first session</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${atRisk.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{atRisk.length}</p>
                    <p className="text-xs text-[#5A6B7A] mt-0.5">Drop-off risk (&gt;48h)</p>
                  </div>
                </div>
              );
            })()}

            {/* Patient Grid */}
            {filteredPatients.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#1B2733] mb-2">
                  {searchQuery ? 'No patients found' : 'No patients yet'}
                </h3>
                <p className="text-[#5A6B7A] max-w-md mx-auto mb-6">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'Share your provider link with families to start building your patient roster. Parents can connect and grant you access to their Insight Navigator profiles.'}
                </p>
                {!searchQuery && (
                  <Button className="bg-primary hover:bg-[#216982]">
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
                      ? 'border-[#6B9080]/20/60 hover:border-[#6B9080]/30/60'
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
                        <h4 className="font-semibold text-[#1B2733]">{patient.childName}</h4>
                        <p className="text-sm text-[#5A6B7A]">
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
                    <div className="text-sm text-[#5A6B7A]">
                      {patient.totalSessions === 0 && patient.profileAccess === 'granted' ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Awaiting first session
                        </span>
                      ) : (
                        <>
                          {patient.totalSessions} total sessions
                          {patient.nextSession && (
                            <span className="text-[#6B9080] ml-2">
                              • Next: {formatDate(patient.nextSession)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {patient.profileAccess === 'granted' && (
                      <Button size="sm" variant="ghost" className="text-[#6B9080]">
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
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Upcoming Sessions</h2>
              <Button className="bg-primary hover:bg-[#216982]">
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
                        <span className="text-lg font-semibold text-[#6B9080]">
                          {session.patientName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#1B2733]">{session.patientName}</h4>
                        <p className="text-sm text-[#5A6B7A]">
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
                        <p className="text-sm text-[#5A6B7A]">Starts in</p>
                        <p className="font-semibold text-[#6B9080]">
                          {formatTimeUntil(session.scheduledAt)}
                        </p>
                      </div>

                      {session.hasInsightAccess && (
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Insight
                        </Button>
                      )}
                      <Button size="sm" className="bg-primary hover:bg-[#216982]">
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
                  <h3 className="text-lg font-medium text-[#1B2733] mb-2">
                    No upcoming sessions
                  </h3>
                  <p className="text-[#5A6B7A]">
                    Your schedule is clear. New bookings will appear here.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'start-session' && (
          <TelehealthSessionEngine
            providerId={providerId}
            providerType={provider?.type === 'rbt' ? 'rbt' : 'bcba'}
            patients={patients.map(p => ({
              id: p.id,
              name: p.childName,
              insurancePayer: 'Verify with payer',
            }))}
            onBack={() => setActiveTab('sessions')}
            onStartSession={(config) => {
              // Persist the configured session so the video room + AI documentation
              // layer can pick up modality, CPT codes, and participants on entry.
              try {
                sessionStorage.setItem('aminy_pending_session_config', JSON.stringify(config));
              } catch {
                // sessionStorage may be unavailable (private mode) — non-fatal.
              }
              const sessionId =
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                  ? crypto.randomUUID()
                  : `sess_${providerId}_${new Date().getTime()}`;
              if (onStartTelehealthSession) {
                // VideoCallRoom self-provisions the Daily.co room from this id.
                onStartTelehealthSession(sessionId);
              } else {
                // Fallback when no launcher is wired (e.g. standalone preview).
                onNavigate?.('video-call-room');
              }
            }}
          />
        )}

        {activeTab === 'ai-summaries' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">AI Patient Summaries</h2>
                <p className="text-[#5A6B7A] dark:text-slate-400 mt-1">
                  AI-generated insights for your patients. Submit care plan suggestions that parents can approve.
                </p>
              </div>
            </div>

            {/* Pending family Q's — the provider review queue */}
            {pendingBCBAThreads.length > 0 && (
              <Card className="p-4 border-[#6B9080]/30 bg-[#6B9080]/5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-[#6B9080]" />
                  <h3 className="font-semibold text-[#1B2733] dark:text-white">
                    Family Questions Awaiting Review ({pendingBCBAThreads.length})
                  </h3>
                </div>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-3">
                  AI has drafted instant responses. Review, edit, and sign to complete — families are waiting.
                </p>
                <div className="space-y-2">
                  {pendingBCBAThreads.map(thread => (
                    <div key={thread.id} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-[#E8E4DF]">
                      <div className="w-8 h-8 rounded-full bg-[#6B9080]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4 text-[#6B9080]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-[#1B2733] dark:text-white">
                            {thread.child_name ? `Re: ${thread.child_name}` : thread.parent_name || 'Family'}
                          </p>
                          <span className="text-xs text-[#5A6B7A]">·</span>
                          <span className="text-xs text-[#5A6B7A]">
                            {Math.round((Date.now() - new Date(thread.created_at).getTime()) / 3600000)}h ago
                          </span>
                        </div>
                        <p className="text-sm text-[#3A4A57] dark:text-slate-300 line-clamp-2">{thread.question}</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#6B9080] hover:bg-[#216982] text-white shrink-0"
                        onClick={() => {
                          // Open the thread in a new review modal or navigate to it
                          toast.info('Thread review panel — coming soon. Check Supabase for thread ID: ' + thread.id.slice(0, 8));
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Patient selector for AI summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient list sidebar */}
              <Card className="p-4 lg:col-span-1">
                <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">Select Client</h3>
                <div className="space-y-2">
                  {patients
                    .filter(p => p.profileAccess === 'granted')
                    .map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedPatient?.id === patient.id
                            ? 'bg-[#6B9080]/10 border-[#6B9080]/30 dark:bg-[#6B9080]/15'
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
                            <p className="font-medium text-[#1B2733] dark:text-white">{patient.childName}</p>
                            <p className="text-sm text-[#5A6B7A] dark:text-slate-400">{patient.age} years old</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  {patients.filter(p => p.profileAccess === 'granted').length === 0 && (
                    <div className="text-center py-8 text-[#5A6B7A]">
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
                    <Brain className="w-16 h-16 mx-auto mb-4 text-neutral-200 dark:text-[#5A6B7A]" />
                    <h3 className="text-lg font-medium text-[#1B2733] dark:text-white mb-2">
                      Select a Patient
                    </h3>
                    <p className="text-[#5A6B7A] dark:text-slate-400 max-w-md mx-auto">
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
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Earnings Overview</h2>
              <Button variant="outline">
                <DollarSign className="w-4 h-4 mr-2" />
                Request Payout
              </Button>
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                // Trend chips intentionally omitted until real month-over-month
                // comparison data exists — never show fabricated growth percentages.
                { label: 'This Month', value: `$${earnings.thisMonth.toLocaleString()}`, color: 'teal' as const, trend: undefined as string | undefined },
                { label: 'Last Month', value: `$${earnings.lastMonth.toLocaleString()}`, color: 'neutral' as const, trend: undefined as string | undefined },
                { label: 'Pending', value: `$${earnings.pending.toLocaleString()}`, color: 'amber' as const, trend: undefined as string | undefined },
                { label: 'YTD Total', value: `$${earnings.ytd.toLocaleString()}`, color: 'green' as const, trend: undefined as string | undefined }
              ].map((stat, i) => (
                <Card key={i} className="p-5">
                  <p className="text-sm text-[#5A6B7A] mb-1">{stat.label}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-xl sm:text-2xl font-bold text-[#1B2733]">{stat.value}</p>
                    {stat.trend && (
                      <span className={`text-sm font-medium ${stat.color === 'teal' ? 'text-[#6B9080]' : 'text-green-600'}`}>
                        <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Recent Transactions — sample list shown ONLY in demo mode */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-[#1B2733] mb-4">Recent Sessions</h3>
              {!isDemoMode() && (
                <div className="py-8 text-center">
                  <DollarSign className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-[#5A6B7A]">No sessions yet. Completed sessions and payouts will appear here.</p>
                </div>
              )}
              <div className="space-y-3">
                {(isDemoMode() ? [
                  { patient: 'Emma Thompson', date: 'Today', type: 'Parent Consultation', amount: 99, status: 'pending' },
                  { patient: 'Liam Chen', date: 'Yesterday', type: 'Follow-up Session', amount: 99, status: 'completed' },
                  { patient: 'Noah Williams', date: 'Jan 8', type: 'Parent Consultation', amount: 99, status: 'completed' },
                  { patient: 'Emma Thompson', date: 'Jan 5', type: 'Assessment', amount: 175, status: 'completed' }
                ] : []).map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#6B9080]/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-[#6B9080]">
                          {tx.patient.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-[#1B2733]">{tx.patient}</p>
                        <p className="text-sm text-[#5A6B7A]">{tx.type} • {tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1B2733]">${tx.amount}</p>
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
            <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Settings</h2>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-[#1B2733] mb-4">Profile</h3>
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white text-2xl font-semibold">
                  {provider.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-[#1B2733]">{provider.name}</p>
                  <p className="text-[#5A6B7A]">{provider.credentials}</p>
                  <Button variant="ghost" size="sm" className="mt-1 text-[#6B9080] -ml-2">
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
                      <Badge key={s} className="bg-[#6B9080]/10 text-[#6B9080]">{s}</Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="text-[#6B9080]">
                      + Add
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Session Rate
                  </label>
                  <Input defaultValue="Set by Aminy based on credentials" disabled className="bg-neutral-50" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-[#1B2733] dark:text-white mb-4">Credentials & Verification</h3>
              <p className="text-neutral-600 dark:text-slate-400 mb-4 text-sm">
                Verified credentials build trust with families and enable insurance billing
              </p>
              <CredentialBadge providerId={providerId} showDetails={true} />
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-[#1B2733] dark:text-white mb-2">Practice Branding</h3>
              <p className="text-[#5A6B7A] dark:text-slate-400 text-sm mb-4">
                Customize how your practice appears to families. Your logo and name will display in the header with "powered by Aminy."
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Practice / Clinic Name</label>
                  <Input
                    value={brandingForm.orgName}
                    onChange={e => setBrandingForm(prev => ({ ...prev, orgName: e.target.value }))}
                    placeholder="e.g., Bright Path ABA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Logo URL</label>
                  <Input
                    value={brandingForm.logoUrl}
                    onChange={e => setBrandingForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://yoursite.com/logo.png"
                  />
                  <p className="text-xs text-neutral-400 mt-1">Square image recommended (128×128 or larger)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingForm.primaryColor || '#6B9080'}
                      onChange={e => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-neutral-200 cursor-pointer"
                    />
                    <Input
                      value={brandingForm.primaryColor}
                      onChange={e => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#6B9080"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={async () => {
                      if (!brandingForm.orgName.trim()) return;
                      await saveBranding(providerId, {
                        orgName: brandingForm.orgName,
                        logoUrl: brandingForm.logoUrl || undefined,
                        primaryColor: brandingForm.primaryColor || undefined,
                        tagline: brandingForm.tagline || undefined,
                      });
                      setBranding(getBranding());
                    }}
                    className="bg-primary hover:bg-primary text-white"
                  >
                    <Save className="w-4 h-4 mr-1" /> Save Branding
                  </Button>
                  {branding?.orgName && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        localStorage.removeItem('aminy-provider-branding');
                        setBranding(null);
                        setBrandingForm({ orgName: '', logoUrl: '', primaryColor: '', tagline: '' });
                      }}
                    >
                      Reset to Aminy
                    </Button>
                  )}
                </div>
                {branding?.orgName && (
                  <div className="mt-3 p-3 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-[#5A6B7A] dark:text-slate-400 mb-2">Preview:</p>
                    <div className="flex items-center gap-2">
                      {branding.logoUrl ? (
                        <img src={branding.logoUrl} alt="Provider branding logo" className="w-6 h-6 rounded object-contain" />
                      ) : (
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: branding.primaryColor || '#6B9080' }}>
                          {branding.orgName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-semibold text-[#1B2733] dark:text-white">{branding.orgName}</span>
                        <span className="block text-[9px] text-neutral-400">powered by Aminy</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-[#1B2733] mb-4">Availability</h3>
              <p className="text-neutral-600 mb-4">
                Set your available hours for patient bookings
              </p>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Manage Calendar
              </Button>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-[#1B2733] mb-4">Notifications</h3>
              <div className="space-y-3">
                {[
                  'New booking notifications',
                  'Session reminders (30 min before)',
                  'Profile access requests',
                  'Payment notifications'
                ].map((pref, i) => (
                  <label key={i} className="flex items-center justify-between">
                    <span className="text-neutral-700">{pref}</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-[#6B9080] focus:ring-teal-500" />
                  </label>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'insights' && (
          <ProviderInsightsDashboard
            providerId={providerId}
            patients={patients.map(p => ({
              id: p.id,
              childName: p.childName,
              parentName: p.parentName,
              conditions: p.conditions,
              profileAccess: p.profileAccess,
            }))}
          />
        )}

        {activeTab === 'coordination' && selectedPatient && selectedPatient.profileAccess === 'granted' ? (
          <CareCoordination
            providerId={providerId}
            patientId={selectedPatient.id}
            patientName={selectedPatient.childName}
            parentName={selectedPatient.parentName}
            parentId="parent-123"
          />
        ) : activeTab === 'coordination' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">Care Coordination</h2>
              <p className="text-[#5A6B7A] dark:text-slate-400 mt-1">
                Select a patient with granted access to view their care team
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients
                .filter(p => p.profileAccess === 'granted')
                .map(patient => (
                  <Card
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-[#6B9080]/30 dark:hover:border-teal-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <span className="text-lg font-semibold text-violet-700 dark:text-violet-400">
                          {patient.childName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-[#1B2733] dark:text-white">{patient.childName}</h4>
                        <p className="text-sm text-[#5A6B7A] dark:text-slate-400">{patient.parentName}</p>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-4 bg-primary hover:bg-[#216982]">
                      View Care Team
                    </Button>
                  </Card>
                ))}
            </div>

            {patients.filter(p => p.profileAccess === 'granted').length === 0 && (
              <Card className="p-12 text-center">
                <Heart className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-[#5A6B7A]" />
                <h3 className="text-lg font-medium text-[#1B2733] dark:text-white mb-2">
                  No Patients with Access
                </h3>
                <p className="text-[#5A6B7A] dark:text-slate-400 max-w-md mx-auto">
                  Request access from patient families to collaborate with their care team.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Clinical Notes Tab */}
        {activeTab === 'clinical-notes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">Clinical Notes</h2>
                <p className="text-[#5A6B7A] dark:text-slate-400 mt-1">
                  SOAP notes, ABA session notes, and progress documentation
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingNote({
                    noteType: 'soap',
                    patientId: '',
                    patientName: patients[0]?.childName || 'Client',
                    content: {},
                  });
                  setShowNoteEditor(true);
                }}
                className="bg-primary hover:bg-primary text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> New Note
              </Button>
            </div>

            {/* Note Editor */}
            {showNoteEditor && editingNote && (
              <Card className="p-5 border-2 border-[#6B9080]/20 dark:border-[#6B9080]/30 bg-white dark:bg-slate-900">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#1B2733] dark:text-white">New Clinical Note</h3>
                    <button
                      type="button"
                      onClick={() => { setShowNoteEditor(false); setEditingNote(null); }}
                      aria-label="Close note editor"
                      className="min-h-11 min-w-11 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* CPT Code + Patient Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1 block">
                        <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-500" />CPT Code
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#1B2733] dark:text-white text-sm"
                        value={editingNote.cptCode || ''}
                        onChange={e => {
                          const code = e.target.value;
                          const cpt = getCPTByCode(code);
                          setEditingNote(prev => {
                            if (!prev) return prev;
                            if (cpt) {
                              return { ...prev, cptCode: code, noteType: cpt.noteTemplate as NoteType, content: {} };
                            }
                            return { ...prev, cptCode: code };
                          });
                        }}
                      >
                        <option value="">Select CPT code...</option>
                        <optgroup label="ABA / Behavior Analysis">
                          {CPT_CODES.filter(c => c.category === 'aba').map(c => (
                            <option key={c.code} value={c.code}>{c.code} — {c.shortName}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Speech-Language Pathology">
                          {CPT_CODES.filter(c => c.category === 'slp').map(c => (
                            <option key={c.code} value={c.code}>{c.code} — {c.shortName}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Mental Health">
                          {CPT_CODES.filter(c => c.category === 'mental-health').map(c => (
                            <option key={c.code} value={c.code}>{c.code} — {c.shortName}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Diagnostic / Psych Testing">
                          {CPT_CODES.filter(c => c.category === 'diagnostic').map(c => (
                            <option key={c.code} value={c.code}>{c.code} — {c.shortName}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Developmental Pediatrics">
                          {CPT_CODES.filter(c => c.category === 'dev-ped').map(c => (
                            <option key={c.code} value={c.code}>{c.code} — {c.shortName}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1 block">Client</label>
                      <select
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#1B2733] dark:text-white text-sm"
                        value={editingNote.patientName}
                        onChange={e => setEditingNote(prev => prev ? { ...prev, patientName: e.target.value } : prev)}
                      >
                        {patients.length > 0 ? patients.map(p => (
                          <option key={p.id} value={p.childName}>{p.childName}</option>
                        )) : <option value="Client">Demo Patient</option>}
                      </select>
                    </div>
                  </div>

                  {/* CPT Billing Tip */}
                  {editingNote.cptCode && (() => {
                    const cpt = getCPTByCode(editingNote.cptCode);
                    if (!cpt) return null;
                    return (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs">
                            <p className="font-semibold text-amber-800 dark:text-amber-300">{cpt.code} — {cpt.description}</p>
                            <p className="text-amber-700 dark:text-amber-400 mt-1">{cpt.billingTip}</p>
                            <p className="text-amber-600 dark:text-amber-500 mt-1">Duration: {cpt.typicalDuration} • Modifiers: {cpt.commonModifiers.join(', ') || 'none'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Note Type (auto-selected by CPT, but can be overridden) */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1 block">
                      Note Template {editingNote.cptCode ? <span className="text-xs text-[#6B9080] font-normal">(auto-selected by CPT)</span> : ''}
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#1B2733] dark:text-white text-sm"
                      value={editingNote.noteType}
                      onChange={e => setEditingNote(prev => prev ? { ...prev, noteType: e.target.value as NoteType, content: {} } : prev)}
                    >
                      {(Object.entries(NOTE_TEMPLATES) as [NoteType, typeof NOTE_TEMPLATES[NoteType]][]).map(([key, tmpl]) => (
                        <option key={key} value={key}>{tmpl.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Template-driven fields with required indicators */}
                  <div className="space-y-3">
                    {NOTE_TEMPLATES[editingNote.noteType].fields.map(({ key, label, placeholder, rows }) => {
                      const cpt = editingNote.cptCode ? getCPTByCode(editingNote.cptCode) : null;
                      const isRequired = cpt?.requiredFields.includes(key);
                      return (
                        <div key={key}>
                          <label className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1 block">
                            {label}
                            {isRequired && <span className="text-rose-500 ml-1" title="Required for billing">*</span>}
                          </label>
                          <Textarea
                            value={editingNote.content[key] || ''}
                            onChange={e => setEditingNote(prev => prev ? { ...prev, content: { ...prev.content, [key]: e.target.value } } : prev)}
                            placeholder={placeholder}
                            className={`text-sm ${isRequired && !editingNote.content[key]?.trim() ? 'border-rose-200 dark:border-rose-800' : ''} ${rows ? `min-h-[${rows * 24}px]` : 'min-h-[80px]'}`}
                            rows={rows || 3}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Billing Compliance Check */}
                  {editingNote.cptCode && (() => {
                    const validation = validateNoteForCPT(editingNote.cptCode, editingNote.content);
                    if (validation.valid && validation.warnings.length === 0) return null;
                    return (
                      <div className={`p-3 rounded-lg text-xs ${validation.valid ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60' : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60'}`}>
                        {!validation.valid && (
                          <p className="font-medium text-rose-700 dark:text-rose-300 mb-1">
                            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                            Missing required fields for {editingNote.cptCode}: {validation.missingFields.join(', ')}
                          </p>
                        )}
                        {validation.warnings.map((w, i) => (
                          <p key={i} className="text-amber-700 dark:text-amber-400">{w}</p>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Save Button */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setShowNoteEditor(false); setEditingNote(null); }}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveClinicalNote}
                      disabled={isSavingNotes}
                      className="bg-primary hover:bg-primary text-white"
                    >
                      {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      Save Note
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Existing Notes List */}
            {clinicalNotes.length === 0 && !showNoteEditor && (
              <Card className="p-8 text-center">
                <ClipboardList className="w-12 h-12 mx-auto text-neutral-300 dark:text-[#5A6B7A] mb-3" />
                <p className="text-[#5A6B7A] dark:text-slate-400 font-medium">No clinical notes yet</p>
                <p className="text-neutral-400 dark:text-[#5A6B7A] text-sm mt-1">Create your first note to start documenting sessions</p>
              </Card>
            )}

            {clinicalNotes.map(note => {
              const tmpl = NOTE_TEMPLATES[note.noteType];
              const isJustSaved = lastSavedNoteId === note.id;
              return (
                <Card key={note.id} className={`p-4 ${note.locked ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' : ''} ${isJustSaved ? 'ring-2 ring-teal-400/60' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#1B2733] dark:text-white">{note.patientName}</h3>
                        <Badge className={tmpl.badgeClass}>{tmpl.badge}</Badge>
                        {note.cptCode && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-mono text-xs">
                            CPT {note.cptCode}
                          </Badge>
                        )}
                        {note.signed && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <Lock className="w-3 h-3 mr-1" /> Signed & Locked
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-0.5">{note.date}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGenerateSuperbill(note.id)}
                        aria-label={`Generate superbill for note from ${note.patientName}`}
                        title="Generate Superbill"
                        className="text-[#6B9080] hover:text-[#6B9080] hover:bg-[#6B9080]/10"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {!note.locked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSignLockNote(note.id)}
                          aria-label={`Sign and lock note for ${note.patientName}`}
                          title="Sign & Lock"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExportNotePDF(note.id)}
                        aria-label={`Export note for ${note.patientName}`}
                        title="Export"
                      >
                        <Download className="w-4 h-4 text-[#5A6B7A]" />
                      </Button>
                    </div>
                  </div>

                  {/* Template-driven content preview — shows first 2 fields */}
                  <div className="space-y-1 text-sm text-neutral-600 dark:text-slate-300">
                    {tmpl.fields.slice(0, 3).map(f => {
                      const val = note.content[f.key];
                      if (!val) return null;
                      return (
                        <p key={f.key}>
                          <span className="font-medium text-neutral-700 dark:text-slate-200">{f.label.split('—')[0].split('/')[0].trim()}:</span>{' '}
                          {val.slice(0, 120)}{val.length > 120 ? '...' : ''}
                        </p>
                      );
                    })}
                  </div>

                  {/* "Generate Superbill" CTA shown on the just-saved note */}
                  {isJustSaved && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-slate-700">
                      <Button
                        onClick={() => handleGenerateSuperbill(note.id)}
                        className="w-full bg-primary hover:bg-primary text-white"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Superbill for This Session
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Supervision Tab */}
        {activeTab === 'supervision' && (
          <SupervisionDashboard
            onBack={() => setActiveTab('dashboard')}
            onNavigateToRBTLog={() => { setPracticeView('sessions'); setActiveTab('my-practice'); }}
            onNavigateToAssessment={() => onNavigate?.('credentialing-support')}
          />
        )}

        {/* Credentialing Tab */}
        {activeTab === 'credentialing' && (
          <div className="space-y-6">
            <CredentialingOrchestrator
              providerId={providerId}
              onBack={() => setActiveTab('dashboard')}
            />
            <Card className="p-5 rounded-2xl border border-neutral-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#1B2733] dark:text-white">Payout Setup</h3>
                  <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                    Configure your bank account for scheduled biweekly payouts via Aminy
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('provider-payout-setup')}
                  className="flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Set Up Payouts
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">Claims & Billing</h2>
              <p className="text-[#5A6B7A] dark:text-slate-400 mt-1">
                Aminy submits all claims under the Aminy Network group NPI. Payments are issued on a net-30 basis after payer remittance; contact billing support if a payer is delayed beyond 45 days.
              </p>
            </div>
            <ClaimReadyQueue
              providerId={providerId}
              onBack={() => setActiveTab('dashboard')}
              onNavigateTo={(screen) => onNavigate?.(screen)}
            />
            <Card className="p-5 rounded-2xl border border-neutral-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#1B2733] dark:text-white">Denial Workbench</h3>
                  <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                    Review and appeal denied claims with AI-assisted justifications
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('denial-workbench')}
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  Open Workbench
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* My Practice (BCBA Practice Management) */}
        {activeTab === 'my-practice' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">
                {isOrgCaseload ? 'Organization Caseload' : 'My Practice'}
              </h2>
              <p className="text-[#5A6B7A] dark:text-slate-400 mt-1">
                {isOrgCaseload
                  ? 'Manage your organization caseload through Aminy — your RBT roster, their session documentation, and supervision compliance in one place.'
                  : 'Run your own independent practice through Aminy: your RBT roster, their session documentation, supervision compliance, and how you get paid — all in one place.'}
              </p>
            </div>

            {/* Practice loop navigator — moves coherently through the BCBA → RBT → families flow */}
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'overview' as const, label: 'Overview', icon: Briefcase },
                { id: 'rbts' as const, label: isOrgCaseload ? 'Caseload RBTs' : 'Your RBTs', icon: Users },
                { id: 'sessions' as const, label: 'RBT Sessions', icon: ClipboardList },
                { id: 'roster' as const, label: 'Payer Roster', icon: ShieldCheck },
              ]).map((view) => (
                <button
                  key={view.id}
                  onClick={() => setPracticeView(view.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-medium transition-colors ${
                    practiceView === view.id
                      ? 'border-[#6B9080] bg-[#6B9080]/10 text-[#6B9080] dark:bg-[#6B9080]/10 dark:text-[#7BA7BC]'
                      : 'border-[#E8E4DF] bg-white text-neutral-600 hover:border-[#6B9080]/20 hover:text-neutral-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <view.icon className="w-4 h-4" />
                  {view.label}
                </button>
              ))}
            </div>

            {/* ── Your RBTs (BCBA manages their RBT roster) ──────────────── */}
            {practiceView === 'rbts' && (
              <div className="space-y-4">
                <Card className="p-4 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#1B2733] dark:text-white">
                        {isOrgCaseload ? 'Caseload RBTs' : 'Your RBTs'}
                      </h3>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-0.5">
                        Invite RBTs, track BACB 5% supervision, then review their logged sessions.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPracticeView('sessions')}
                      className="flex items-center gap-1.5 shrink-0"
                    >
                      Review sessions
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
                <RBTManagement providerId={providerId} />
              </div>
            )}

            {/* ── RBT Sessions (review / log RBT direct-service sessions) ── */}
            {practiceView === 'sessions' && (
              <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-slate-700">
                <RBTSessionLog onBack={() => setPracticeView('rbts')} />
              </div>
            )}

            {/* ── Payer Roster (per-payer roster + update requests) ──────── */}
            {practiceView === 'roster' && (
              <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-slate-700">
                <RosterManager providerId={providerId} onBack={() => setPracticeView('overview')} />
              </div>
            )}

            {/* ── Overview (practice launch score + billing rails) ──────── */}
            {practiceView === 'overview' && practiceSummary && (
              <Card className="p-5 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#5A6B7A] dark:text-slate-400">Practice Launch Score</p>
                    <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white mt-1">{practiceSummary.headline}</h3>
                    <p className="text-sm text-neutral-600 dark:text-slate-300 mt-2 max-w-2xl">{practiceSummary.supportingCopy}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(provider?.licensedStates || []).slice(0, 4).map((state) => (
                        <Badge key={state} variant="outline">{state}</Badge>
                      ))}
                      {(provider?.acceptedInsurance || []).slice(0, 3).map((plan) => (
                        <Badge key={plan} className="bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">{plan}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 min-w-[220px]">
                    <div className="rounded-xl bg-[#6B9080]/10 dark:bg-[#6B9080]/10 p-3">
                      <p className="text-xs text-[#6B9080] dark:text-[#7BA7BC]">Readiness</p>
                      <p className="text-2xl font-semibold text-[#6B9080] dark:text-[#7BA7BC]">{practiceSummary.readinessScore}%</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3">
                      <p className="text-xs text-violet-700 dark:text-violet-300">Monthly range</p>
                      <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">${practiceSummary.monthlyRevenueRange.low.toLocaleString()} - ${practiceSummary.monthlyRevenueRange.high.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {practiceSummary.checklist.map((item) => (
                    <div key={item.id} className={`rounded-xl border p-3 ${item.completed ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-1 ${item.completed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          {item.completed ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-[#1B2733] dark:text-white">{item.label}</p>
                          <p className="text-sm text-neutral-600 dark:text-slate-300 mt-1">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 dark:border-slate-700 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#5A6B7A] dark:text-slate-400">Supported Market</p>
                    <h4 className="mt-2 text-base font-semibold text-[#1B2733] dark:text-white">
                      {practiceMarketCoverage ? practiceMarketCoverage.label : 'Expand to a supported state'}
                    </h4>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-slate-300">
                      {practiceMarketCoverage ? practiceMarketCoverage.notes[0] || `Coverage Coach is active across the ${practiceMarketCoverage.label} payer matrix.` : 'Complete licensure in AZ, MT, or TX to unlock Aminy cash-pay and partner-billed coverage routing.'}
                    </p>
                    {practiceMarketCoverage ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {practiceMarketCoverage.payerProducts.slice(0, 4).map((payer) => (
                          <Badge key={payer.id} variant="outline">{payer.displayName}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-neutral-200 dark:border-slate-700 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#5A6B7A] dark:text-slate-400">Claim-Ready Queue</p>
                    <h4 className="mt-2 text-base font-semibold text-[#1B2733] dark:text-white">{practiceClaimQueueSummary.readyForBiller} ready · {practiceClaimQueueSummary.blocked} blocked</h4>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-slate-300">
                      Aminy assembles claim-ready visit packets for supported-state payer rails. Biller review stays explicit before any submission lane runs.
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2">
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Ready</p>
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">{practiceClaimQueueSummary.readyForBiller}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-2">
                        <p className="text-xs text-amber-700 dark:text-amber-300">Blocked</p>
                        <p className="font-semibold text-amber-700 dark:text-amber-300">{practiceClaimQueueSummary.blocked}</p>
                      </div>
                      <div className="rounded-xl bg-[#EEF4F8] dark:bg-blue-900/20 p-2">
                        <p className="text-xs text-blue-700 dark:text-blue-300">Submitted</p>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">{practiceClaimQueueSummary.submitted}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Billing rails (overview only) — honest live vs. roadmap ── */}
            {practiceView === 'overview' && (
              <Card className="p-5 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-5 h-5 text-[#6B9080]" />
                  <h3 className="font-semibold text-[#1B2733] dark:text-white">How you get paid</h3>
                </div>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-4">
                  Choose how sessions are billed. You can run cash-pay today and layer in payer-network billing as it becomes available.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Cash-pay — LIVE */}
                  <div className="rounded-2xl border border-[#6B9080]/20 dark:border-[#6B9080]/30 bg-[#6B9080]/10/60 dark:bg-[#6B9080]/10 p-4 flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-[#1B2733] dark:text-white">Cash-pay sessions</h4>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Live</Badge>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-slate-300 mt-2 flex-1">
                      Families pay directly through the Aminy marketplace. Funds settle to your bank via Stripe Connect.
                      Aminy retains {Math.round(getPlatformFeeRate('cash_pay') * 100)}% of each cash-pay session; you keep the rest.
                    </p>
                    <Button
                      onClick={() => onNavigate?.('provider-payout-setup')}
                      className="mt-3 bg-primary hover:bg-primary text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Set up cash-pay payouts
                    </Button>
                  </div>

                  {/* Payer-network billing — ROADMAP, interest capture */}
                  <div className="rounded-2xl border border-[#E8E4DF] dark:border-teal-900/40 bg-[#6B9080]/10/60 dark:bg-[#1a3a5c]/10 p-4 flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-[#1B2733] dark:text-white">Payer-network billing</h4>
                      <Badge className="bg-[#6B9080]/10 text-[#6B9080] dark:bg-[#1a3a5c]/40 dark:text-[#7BA7BC]">Early access</Badge>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-slate-300 mt-2 flex-1">
                      Lease an established payer network so insured families can book you without your own contracts.
                      We're onboarding our first cohort of providers — join the list to get early access.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 border-[#6B9080]/30 text-[#6B9080] hover:bg-[#6B9080]/10"
                      onClick={() => { toast.success('You\'re on the early access list! We\'ll reach out when payer-network billing opens in your area.'); }}
                    >
                      Get early access
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Group sessions — practice-in-a-box high-margin product */}
            {practiceView === 'overview' && provider && (
              <GroupSessionCreator
                providerId={providerId}
                providerName={provider.name}
                providerCredentials={provider.credentials}
                providerPhotoUrl={provider.photo}
              />
            )}

            {/* Next step into the practice loop (overview only) */}
            {practiceView === 'overview' && (
              <Card className="p-5 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#1B2733] dark:text-white">
                      {isOrgCaseload ? 'Manage your caseload RBTs' : 'Build out your RBT team'}
                    </h3>
                    <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-0.5">
                      Invite RBTs, review their logged sessions, and stay BACB-compliant on supervision.
                    </p>
                  </div>
                  <Button
                    onClick={() => setPracticeView('rbts')}
                    className="bg-primary hover:bg-primary text-white shrink-0"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {isOrgCaseload ? 'Open caseload RBTs' : 'Manage your RBTs'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <ProviderPerformanceTab providerId={providerId} />
        )}
      </main>

      {/* Superbill Generator Overlay */}
      {showSuperbillGenerator && generatedSuperbill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
            <div className="p-4 border-b border-neutral-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1B2733] dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#6B9080]" />
                  Superbill — {generatedSuperbill.patientName}
                </h2>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                  Pre-filled from session data. Review and download.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSuperbillGenerator(false);
                  setGeneratedSuperbill(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-0">
              <React.Suspense fallback={
                <div className="p-12 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-[#6B9080] border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm text-[#5A6B7A]">Loading superbill generator...</p>
                </div>
              }>
                <SuperbillGenerator
                  userId={generatedSuperbill.userId}
                  childName={generatedSuperbill.patientName}
                  childDOB={generatedSuperbill.patientDOB}
                  appointmentId={generatedSuperbill.appointmentId}
                  appointmentDate={generatedSuperbill.dateOfService}
                  providerName={generatedSuperbill.providerName}
                  providerCredentials={generatedSuperbill.providerCredentials}
                  providerNPI={generatedSuperbill.providerNPI}
                  onClose={() => {
                    setShowSuperbillGenerator(false);
                    setGeneratedSuperbill(null);
                  }}
                />
              </React.Suspense>
            </div>
          </Card>
        </div>
      )}

      {/* Superbill Toast Notification */}
      {superbillToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-primary text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{superbillToast}</span>
            <button
              type="button"
              onClick={() => setSuperbillToast(null)}
              aria-label="Dismiss superbill notification"
              className="ml-2 min-h-11 min-w-11 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-100 sticky top-0 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                    <span className="text-lg sm:text-xl font-semibold text-violet-700">
                      {selectedPatient.childName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">
                      {selectedPatient.childName}
                    </h2>
                    <p className="text-[#5A6B7A]">
                      {selectedPatient.age} years old • {selectedPatient.totalSessions} sessions
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(null)} aria-label="Close patient details">
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
                <h3 className="font-medium text-[#1B2733] mb-2">Conditions</h3>
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
                <h3 className="font-medium text-[#1B2733] mb-2">Session History</h3>
                <p className="text-neutral-600">
                  {selectedPatient.totalSessions} sessions completed
                </p>
                {selectedPatient.lastSessionNotes && (
                  <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-[#5A6B7A] mb-1">Last session notes:</p>
                    <p className="text-neutral-700">{selectedPatient.lastSessionNotes}</p>
                  </div>
                )}
              </div>

              {/* Next Session */}
              {selectedPatient.nextSession && (
                <div>
                  <h3 className="font-medium text-[#1B2733] mb-2">Next Session</h3>
                  <div className="flex items-center gap-3 p-3 bg-[#6B9080]/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#6B9080]" />
                    <span className="text-[#6B9080]">
                      {formatDate(selectedPatient.nextSession)}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-100">
                {selectedPatient.profileAccess === 'granted' && (
                  <Button
                    className="flex-1 bg-primary hover:bg-[#216982]"
                    onClick={() => onNavigate?.('insight-report')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Open Insight Navigator
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingNote({
                      noteType: 'soap',
                      patientId: selectedPatient.id,
                      patientName: selectedPatient.childName,
                      content: {},
                    });
                    setShowNoteEditor(true);
                    setSelectedPatient(null);
                    setActiveTab('clinical-notes');
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Session Notes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate?.('messages')}
                  aria-label={`Message ${selectedPatient.parentName}`}
                >
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
