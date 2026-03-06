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
  X,
  Briefcase,
  Download,
  Printer
} from 'lucide-react';
import type { ProviderType } from '../lib/child-profiles';
import { brandColors } from '../lib/brand-system';
import { supabase } from '../utils/supabase/client';
import { CredentialBadge, VerifiedBadge } from './provider/CredentialBadge';
import { getBranding, saveBranding, type ProviderBranding } from '../lib/provider-branding';
import { CPT_CODES, getCPTByCode, suggestCPTCodes, validateNoteForCPT, type CPTCode } from '../lib/cpt-codes';
import { PatientAISummary } from './provider/PatientAISummary';
import { ProviderInsightsDashboard } from './provider/ProviderInsightsDashboard';
import { CareCoordination } from './provider/CareCoordination';
import { RBTManagement } from './provider/RBTManagement';
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
  needsSetup?: boolean;
}

interface ProviderPortalProps {
  providerId: string;
}

export function ProviderPortal({ providerId }: ProviderPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'sessions' | 'earnings' | 'settings' | 'ai-summaries' | 'insights' | 'coordination' | 'my-practice' | 'clinical-notes'>('dashboard');
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
      label: 'SLP Session Note', badge: 'SLP', badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
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
  const [brandingForm, setBrandingForm] = useState({ orgName: '', logoUrl: '', primaryColor: '', tagline: '' });

  // Superbill generation state
  const [showSuperbillGenerator, setShowSuperbillGenerator] = useState(false);
  const [generatedSuperbill, setGeneratedSuperbill] = useState<Superbill | null>(null);
  const [superbillToast, setSuperbillToast] = useState<string | null>(null);
  const [lastSavedNoteId, setLastSavedNoteId] = useState<string | null>(null);

  // Load provider data from Supabase
  const loadProviderData = useCallback(async () => {
    setIsRefreshing(true);
    if (import.meta.env.DEV) console.log('[ProviderPortal] Loading data for provider:', providerId);

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
        // No earnings data - show zeros
        setEarnings({ thisMonth: 0, lastMonth: 0, pending: 0, ytd: 0 });
      }

      // Update provider stats
      setProvider(prev => prev ? {
        ...prev,
        totalPatients: patientsList.length,
        sessionsThisMonth: sessionsData?.length || sessionsList.length,
        earningsThisMonth: earnings.thisMonth || 0,
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
              {branding?.orgName ? (
                <>
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.orgName} className="w-8 h-8 rounded-lg object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: branding.primaryColor || '#0891b2' }}>
                      {branding.orgName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-neutral-900 dark:text-white">{branding.orgName}</span>
                      <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-medium">
                        {provider.credentials}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-neutral-400 dark:text-slate-500 -mt-0.5">powered by Aminy</span>
                  </div>
                </>
              ) : (
                <>
                  <Logo size="sm" showText={false} />
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-neutral-900 dark:text-white">Provider Portal</span>
                    <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-medium">
                      {provider.credentials}
                    </Badge>
                  </div>
                </>
              )}
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
              { id: 'insights', label: 'Insights', icon: BarChart3 },
              { id: 'ai-summaries', label: 'AI Summaries', icon: Brain },
              { id: 'coordination', label: 'Care Team', icon: Heart },
              { id: 'sessions', label: 'Sessions', icon: Calendar },
              { id: 'earnings', label: 'Earnings', icon: DollarSign },
              { id: 'clinical-notes', label: 'Notes', icon: ClipboardList },
              { id: 'my-practice', label: 'My Practice', icon: Briefcase },
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
                  <Input defaultValue="Set by Aminy based on credentials" disabled className="bg-neutral-50" />
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
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Practice Branding</h3>
              <p className="text-neutral-500 dark:text-slate-400 text-sm mb-4">
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
                      value={brandingForm.primaryColor || '#0891b2'}
                      onChange={e => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-neutral-200 cursor-pointer"
                    />
                    <Input
                      value={brandingForm.primaryColor}
                      onChange={e => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#0891b2"
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
                    className="bg-teal-600 hover:bg-teal-700 text-white"
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
                    <p className="text-xs text-neutral-500 dark:text-slate-400 mb-2">Preview:</p>
                    <div className="flex items-center gap-2">
                      {branding.logoUrl ? (
                        <img src={branding.logoUrl} alt="" className="w-6 h-6 rounded object-contain" />
                      ) : (
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: branding.primaryColor || '#0891b2' }}>
                          {branding.orgName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{branding.orgName}</span>
                        <span className="block text-[9px] text-neutral-400">powered by Aminy</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Care Coordination</h2>
              <p className="text-neutral-500 dark:text-slate-400 mt-1">
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
                    className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-teal-300 dark:hover:border-teal-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <span className="text-lg font-semibold text-violet-700 dark:text-violet-400">
                          {patient.childName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-white">{patient.childName}</h4>
                        <p className="text-sm text-neutral-500 dark:text-slate-400">{patient.parentName}</p>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-4 bg-teal-600 hover:bg-teal-700">
                      View Care Team
                    </Button>
                  </Card>
                ))}
            </div>

            {patients.filter(p => p.profileAccess === 'granted').length === 0 && (
              <Card className="p-12 text-center">
                <Heart className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-slate-600" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                  No Patients with Access
                </h3>
                <p className="text-neutral-500 dark:text-slate-400 max-w-md mx-auto">
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
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Clinical Notes</h2>
                <p className="text-neutral-500 dark:text-slate-400 mt-1">
                  SOAP notes, ABA session notes, and progress documentation
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingNote({
                    noteType: 'soap',
                    patientId: '',
                    patientName: patients[0]?.childName || 'Patient',
                    content: {},
                  });
                  setShowNoteEditor(true);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> New Note
              </Button>
            </div>

            {/* Note Editor */}
            {showNoteEditor && editingNote && (
              <Card className="p-5 border-2 border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">New Clinical Note</h3>
                    <button onClick={() => { setShowNoteEditor(false); setEditingNote(null); }} className="text-neutral-400 hover:text-neutral-600">
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
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-neutral-900 dark:text-white text-sm"
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
                      <label className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1 block">Patient</label>
                      <select
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-neutral-900 dark:text-white text-sm"
                        value={editingNote.patientName}
                        onChange={e => setEditingNote(prev => prev ? { ...prev, patientName: e.target.value } : prev)}
                      >
                        {patients.length > 0 ? patients.map(p => (
                          <option key={p.id} value={p.childName}>{p.childName}</option>
                        )) : <option value="Patient">Demo Patient</option>}
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
                      Note Template {editingNote.cptCode ? <span className="text-xs text-teal-600 font-normal">(auto-selected by CPT)</span> : ''}
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-neutral-900 dark:text-white text-sm"
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
                      className="bg-teal-600 hover:bg-teal-700 text-white"
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
                <ClipboardList className="w-12 h-12 mx-auto text-neutral-300 dark:text-slate-600 mb-3" />
                <p className="text-neutral-500 dark:text-slate-400 font-medium">No clinical notes yet</p>
                <p className="text-neutral-400 dark:text-slate-500 text-sm mt-1">Create your first note to start documenting sessions</p>
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
                        <h3 className="font-semibold text-neutral-900 dark:text-white">{note.patientName}</h3>
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
                      <p className="text-sm text-neutral-500 dark:text-slate-400 mt-0.5">{note.date}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateSuperbill(note.id)}
                        title="Generate Superbill"
                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {!note.locked && (
                        <Button variant="ghost" size="sm" onClick={() => handleSignLockNote(note.id)} title="Sign & Lock">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleExportNotePDF(note.id)} title="Export">
                        <Download className="w-4 h-4 text-neutral-500" />
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
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white"
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

        {/* My Practice (BCBA Practice Management) */}
        {activeTab === 'my-practice' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">My Practice</h2>
              <p className="text-neutral-500 dark:text-slate-400 mt-1">
                Manage your RBT team, track supervision hours, and handle billing
              </p>
            </div>
            <RBTManagement providerId={providerId} />
          </div>
        )}
      </main>

      {/* Superbill Generator Overlay */}
      {showSuperbillGenerator && generatedSuperbill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
            <div className="p-4 border-b border-neutral-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  Superbill — {generatedSuperbill.patientName}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400">
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
                  <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">Loading superbill generator...</p>
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
          <div className="bg-teal-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{superbillToast}</span>
            <button
              onClick={() => setSuperbillToast(null)}
              className="ml-2 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
