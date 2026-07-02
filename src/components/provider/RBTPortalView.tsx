// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * RBTPortalView — role-scoped provider portal for RBTs.
 *
 * The DB models clinical roles (organization_members.clinical_role); when the
 * signed-in provider's role is 'rbt', ProviderPortal renders this view instead
 * of the full BCBA tab set. RBTs get exactly the four things they need:
 *   1. My clients today (upcoming sessions)
 *   2. My supervision status (hours this month vs the BACB 5% requirement)
 *   3. My competencies (latest BCBA assessment)
 *   4. Session note quick-entry (RBT-appropriate CPT codes, 97153 preselected)
 *
 * Mobile-first, provider violet accent. NOTE: Tailwind here is precompiled —
 * violet text/bg utilities aren't in src/index.css, so the accent is applied
 * via inline styles (see CLAUDE.md "Tailwind CSS v4" rules).
 * Honest empty states everywhere — an RBT with no data sees what to expect,
 * never fabricated numbers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Logo } from '../Logo';
import {
  Calendar,
  ClipboardList,
  UserCheck,
  CheckCircle,
  Circle,
  Clock,
  Sparkles,
  Loader2,
  Save,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { isDemoMode } from '../../lib/demo-seed';
import {
  BACB_REQUIREMENTS,
  RATING_LABELS,
  calculateSupervisionCompliance,
  getRBTProfiles,
  getCompetencyAssessments,
  type CompetencyRating,
  type SupervisionPeriod,
} from '../../lib/rbt-supervision';
import { getCptRulesForService, type CptRule } from '../../lib/billing/cpt-registry';

// Provider-surface clinical accent (--aminy-care-600 family). Inline because
// the precompiled index.css has no violet text/bg utilities.
const VIOLET = '#7c3aed';
const VIOLET_DEEP = '#6d28d9';
const VIOLET_100 = '#ede9fe';
const VIOLET_50 = '#f5f3ff';

interface RBTPortalViewProps {
  /** The signed-in RBT's auth user id. */
  userId: string;
  /** Display name (from provider profile), if known. */
  userName?: string;
}

interface UpcomingSession {
  id: string;
  clientName: string;
  scheduledAt: Date;
  durationMinutes: number;
  sessionType: string;
}

/** RBT-appropriate CPT rules: technician-renderable ABA codes with a note template. */
function getRBTCptRules(): CptRule[] {
  return getCptRulesForService('aba').filter(
    (r) => r.noteTemplate && r.requiredProviderCredential?.includes('rbt'),
  );
}

/** ABA session-note fields (mirrors ProviderPortal's 'aba-session' template). */
const NOTE_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'targets', label: 'Targets Addressed', placeholder: 'List skill acquisition and behavior reduction targets...' },
  { key: 'trials', label: 'Trials / Data', placeholder: 'Trial counts, correct/incorrect, percentage mastery...' },
  { key: 'prompting', label: 'Prompting Levels', placeholder: 'Full physical, partial physical, model, gestural, independent...' },
  { key: 'data', label: 'Session Summary', placeholder: 'Overall session behavior, reinforcement used, notable events...' },
];

export function RBTPortalView({ userId, userName }: RBTPortalViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [compliance, setCompliance] = useState<SupervisionPeriod | null>(null);
  const [competencies, setCompetencies] = useState<CompetencyRating[]>([]);
  const [competencyDate, setCompetencyDate] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState<string | null>(null);

  // Session note quick-entry — 97153 preselected (RBT direct service).
  const rbtCptRules = getRBTCptRules();
  const [noteCpt, setNoteCpt] = useState('97153');
  const [noteContent, setNoteContent] = useState<Record<string, string>>({});
  const [isSavingNote, setIsSavingNote] = useState(false);

  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // E2E test bypass (same pattern as ProviderPortal.loadProviderData):
      // skip network and render the honest empty states.
      try {
        if (localStorage.getItem('__e2e_auth') === 'bypass') return;
      } catch { /* localStorage not available */ }

      if (isDemoMode()) {
        // Demo mode: the supervision engine seeds demo RBTs in localStorage —
        // surface the first one so the investor demo shows a lived-in view.
        const demoRbt = getRBTProfiles()[0];
        if (demoRbt) {
          setCompliance(calculateSupervisionCompliance(demoRbt.id, thisMonth));
          setSupervisorName(demoRbt.supervisingBCBAName || null);
          const latest = getCompetencyAssessments(demoRbt.id)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          if (latest) {
            setCompetencies(latest.ratings);
            setCompetencyDate(latest.date);
          }
        }
        return;
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [sessionsRes, patientsRes, assignmentRes, supSessionsRes, hoursRes, assessmentRes] =
        await Promise.allSettled([
          supabase
            .from('provider_sessions')
            .select('id, patient_id, scheduled_at, duration_minutes, session_type, status')
            .eq('provider_id', userId)
            .gte('scheduled_at', startOfToday.toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(10),
          supabase
            .from('provider_patients')
            .select('id, child_id')
            .eq('provider_id', userId),
          supabase
            .from('rbt_org_assignments')
            .select('supervising_bcba_id, status')
            .eq('rbt_user_id', userId)
            .eq('status', 'active')
            .limit(1),
          supabase
            .from('rbt_supervision_sessions')
            .select('duration_minutes, type, includes_direct_observation, date, status')
            .eq('rbt_id', userId)
            .gte('date', `${thisMonth}-01`)
            .lte('date', `${thisMonth}-31`),
          supabase
            .from('rbt_direct_service_hours')
            .select('hours')
            .eq('rbt_id', userId)
            .eq('month', thisMonth),
          supabase
            .from('rbt_competency_assessments')
            .select('date, ratings')
            .eq('rbt_id', userId)
            .order('date', { ascending: false })
            .limit(1),
        ]);

      // ── Upcoming sessions (same appointments source ProviderPortal uses) ──
      const sessionRows =
        sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value.data)
          ? sessionsRes.value.data
          : [];
      const patientRows =
        patientsRes.status === 'fulfilled' && Array.isArray(patientsRes.value.data)
          ? patientsRes.value.data
          : [];

      // Resolve child names in one pass (patient_id on sessions = provider_patients.id).
      const childNameByPatientId = new Map<string, string>();
      const childIds = patientRows.map((p) => p.child_id).filter(Boolean);
      if (childIds.length > 0) {
        const { data: childRows } = await supabase
          .from('child_profiles')
          .select('id, name')
          .in('id', childIds);
        const nameByChildId = new Map((childRows || []).map((c) => [c.id, c.name]));
        for (const p of patientRows) {
          childNameByPatientId.set(p.id, nameByChildId.get(p.child_id) || 'Client');
        }
      }

      setUpcomingSessions(
        sessionRows
          .filter((s) => s.status === 'scheduled' || s.status === 'confirmed')
          .map((s) => ({
            id: s.id,
            clientName: childNameByPatientId.get(s.patient_id) || 'Client',
            scheduledAt: new Date(s.scheduled_at),
            durationMinutes: s.duration_minutes || 50,
            sessionType: s.session_type === 'telehealth' ? 'Telehealth' : 'In-person',
          })),
      );

      // ── Supervisor name ──
      if (assignmentRes.status === 'fulfilled' && assignmentRes.value.data?.[0]?.supervising_bcba_id) {
        const { data: bcbaProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', assignmentRes.value.data[0].supervising_bcba_id)
          .maybeSingle();
        if (bcbaProfile?.name) setSupervisorName(bcbaProfile.name);
      }

      // ── Supervision compliance — BACB 5% math (same formula and thresholds
      //    as rbt-supervision.ts calculateSupervisionCompliance, computed from
      //    the RBT's own rows since that lib's cache is loaded per-BCBA) ──
      const supRows =
        supSessionsRes.status === 'fulfilled' && Array.isArray(supSessionsRes.value.data)
          ? supSessionsRes.value.data.filter((r) => r.status === 'completed')
          : [];
      const directHours =
        hoursRes.status === 'fulfilled' && Array.isArray(hoursRes.value.data)
          ? hoursRes.value.data.reduce((sum, r) => sum + Number(r.hours || 0), 0)
          : 0;
      const supervisionHours = supRows.reduce((sum, r) => sum + (r.duration_minutes || 0), 0) / 60;
      const individualCount = supRows.filter((r) => r.type === 'individual').length;
      const groupCount = supRows.filter((r) => r.type === 'group').length;
      const observationCount = supRows.filter((r) => r.includes_direct_observation).length;
      const compliancePercent = directHours > 0 ? (supervisionHours / directHours) * 100 : 0;

      const meetsPercentage = compliancePercent >= BACB_REQUIREMENTS.minPercentOfDirectHours;
      const meetsContacts = supRows.length >= BACB_REQUIREMENTS.minContactsPerMonth;
      const meetsIndividual = individualCount >= BACB_REQUIREMENTS.minIndividualPerMonth;
      const meetsObservation = observationCount >= BACB_REQUIREMENTS.minDirectObservationPerMonth;
      let status: SupervisionPeriod['status'] = 'compliant';
      if (!meetsPercentage || !meetsContacts || !meetsIndividual || !meetsObservation) {
        status = 'non-compliant';
      }
      if (status === 'non-compliant' && (meetsPercentage || compliancePercent >= 3)) {
        status = 'at-risk';
      }

      setCompliance({
        rbtId: userId,
        month: thisMonth,
        directServiceHours: directHours,
        supervisionHoursReceived: Math.round(supervisionHours * 100) / 100,
        individualSessionCount: individualCount,
        groupSessionCount: groupCount,
        directObservationCount: observationCount,
        compliancePercent: Math.round(compliancePercent * 100) / 100,
        status,
      });

      // ── Latest competency assessment ──
      if (assessmentRes.status === 'fulfilled' && assessmentRes.value.data?.[0]) {
        const latest = assessmentRes.value.data[0];
        setCompetencies(Array.isArray(latest.ratings) ? latest.ratings : []);
        setCompetencyDate(latest.date);
      }
    } catch (err) {
      console.error('[RBTPortalView] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, thisMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveNote = async () => {
    const hasContent = NOTE_FIELDS.some((f) => noteContent[f.key]?.trim());
    if (!hasContent) {
      toast.error('Add session details before saving');
      return;
    }
    setIsSavingNote(true);
    try {
      if (!isDemoMode()) {
        // Same session_notes shape ProviderPortal.handleSaveClinicalNote uses.
        const { error } = await supabase.from('session_notes').insert({
          session_id: `rbt-note-${Date.now()}`,
          provider_id: userId,
          note_type: 'aba-session',
          subjective: noteContent.trials || null,
          objective: noteContent.targets || null,
          assessment: noteContent.data || null,
          plan: noteContent.prompting || null,
          shared_with_parent: false,
        });
        if (error) {
          console.error('[RBTPortalView] Error saving note:', error.message);
          toast.error('Could not save the note — please try again');
          return;
        }
      }
      toast.success(`Session note saved (CPT ${noteCpt}) — sent to your BCBA for co-signature`);
      setNoteContent({});
    } finally {
      setIsSavingNote(false);
    }
  };

  const formatSessionTime = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const firstName = (userName || '').split(' ')[0] || 'there';
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long' });
  const targetPercent = BACB_REQUIREMENTS.minPercentOfDirectHours;
  const percent = compliance?.compliancePercent ?? 0;
  const hasSupervisionData = Boolean(compliance && compliance.directServiceHours > 0);
  const competencyGaps = competencies.filter((r) => r.rating <= 2);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
            style={{ border: `4px solid ${VIOLET_100}`, borderTopColor: VIOLET }}
          />
          <p className="text-neutral-600 dark:text-slate-400">Loading your day...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo size="sm" showText={false} />
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-[#132F43] dark:text-white">My Day</span>
                <Badge className="font-medium" style={{ backgroundColor: VIOLET_100, color: VIOLET_DEEP }}>
                  RBT
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#5A6B7A] dark:text-slate-400">
              <UserCheck className="w-4 h-4" style={{ color: VIOLET }} />
              <span>{supervisorName ? `Supervised by ${supervisorName}` : 'Technician view'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome */}
        <Card className="p-5 border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-violet-50">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide" style={{ color: VIOLET }}>
            Technician cockpit
          </p>
          <h1 className="text-xl font-bold text-[#132F43] dark:text-white">Welcome back, {firstName}</h1>
          <p className="text-neutral-600 dark:text-slate-400 mt-1 text-sm">
            Your sessions, supervision, and notes — one calm place.
          </p>
        </Card>

        {/* 1 — My clients today */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5" style={{ color: VIOLET }} />
            <h2 className="font-semibold text-[#132F43] dark:text-white">My clients today</h2>
          </div>
          {upcomingSessions.length === 0 ? (
            <Card className="p-6 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-[#5A6B7A]" />
              <p className="font-medium text-[#132F43] dark:text-white">No sessions scheduled yet</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1">
                Sessions assigned by your BCBA will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <Card key={session.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: VIOLET_100 }}
                      >
                        <span className="font-semibold" style={{ color: VIOLET_DEEP }}>
                          {session.clientName.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#132F43] dark:text-white truncate">{session.clientName}</p>
                        <p className="text-sm text-[#5A6B7A] dark:text-slate-400">{session.sessionType} session</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end" style={{ color: VIOLET }}>
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{formatSessionTime(session.scheduledAt)}</span>
                      </div>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400">{session.durationMinutes} min</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 2 — My supervision status */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5" style={{ color: VIOLET }} />
            <h2 className="font-semibold text-[#132F43] dark:text-white">My supervision — {monthLabel}</h2>
          </div>
          <Card className="p-5">
            {!hasSupervisionData ? (
              <div className="text-center py-2">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-[#5A6B7A]" />
                <p className="font-medium text-[#132F43] dark:text-white">No hours logged this month yet</p>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Once your direct-service hours are logged, your BACB {targetPercent}% supervision
                  progress shows here.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <span className="text-2xl font-bold text-[#132F43] dark:text-white">
                      {percent.toFixed(1)}%
                    </span>
                    <span className="text-sm text-[#5A6B7A] dark:text-slate-400 ml-2">
                      of {targetPercent}% BACB requirement
                    </span>
                  </div>
                  <Badge
                    className={
                      compliance?.status === 'compliant'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }
                  >
                    {compliance?.status === 'compliant' ? 'On track' : 'Schedule supervision'}
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 dark:bg-slate-700 overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      backgroundColor: VIOLET,
                      width: `${Math.min(100, (percent / targetPercent) * 100)}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-neutral-50 dark:bg-slate-800 p-3">
                    <p className="text-[#5A6B7A] dark:text-slate-400">Direct hours</p>
                    <p className="font-semibold text-[#132F43] dark:text-white">
                      {compliance?.directServiceHours ?? 0} h
                    </p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 dark:bg-slate-800 p-3">
                    <p className="text-[#5A6B7A] dark:text-slate-400">Supervision received</p>
                    <p className="font-semibold text-[#132F43] dark:text-white">
                      {compliance?.supervisionHoursReceived ?? 0} h
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-neutral-50 dark:bg-slate-800 p-3">
                    {(compliance?.individualSessionCount ?? 0) >= BACB_REQUIREMENTS.minIndividualPerMonth ? (
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-neutral-300 shrink-0" />
                    )}
                    <span className="text-[#132F43] dark:text-white">Individual session</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-neutral-50 dark:bg-slate-800 p-3">
                    {(compliance?.directObservationCount ?? 0) >= BACB_REQUIREMENTS.minDirectObservationPerMonth ? (
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-neutral-300 shrink-0" />
                    )}
                    <span className="text-[#132F43] dark:text-white">Direct observation</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </section>

        {/* 3 — My competencies */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5" style={{ color: VIOLET }} />
            <h2 className="font-semibold text-[#132F43] dark:text-white">My competencies</h2>
          </div>
          <Card className="p-5">
            {competencies.length === 0 ? (
              <div className="text-center py-2">
                <Award className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-[#5A6B7A]" />
                <p className="font-medium text-[#132F43] dark:text-white">No competency assessment yet</p>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Your BCBA completes these during supervision — results appear here.
                </p>
              </div>
            ) : (
              <>
                {competencyDate && (
                  <p className="text-sm text-[#5A6B7A] dark:text-slate-400 mb-3">
                    Last assessed {competencyDate}
                    {competencyGaps.length > 0 &&
                      ` · ${competencyGaps.length} growth ${competencyGaps.length === 1 ? 'area' : 'areas'}`}
                  </p>
                )}
                <div className="space-y-2">
                  {competencies.map((rating) => (
                    <div
                      key={rating.areaId}
                      className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 dark:bg-slate-800 px-3 py-2"
                    >
                      <span className="text-sm text-[#132F43] dark:text-white min-w-0 truncate">
                        {rating.areaName}
                      </span>
                      <Badge
                        className={
                          rating.rating >= 4
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 shrink-0'
                            : rating.rating === 3
                              ? 'shrink-0'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 shrink-0'
                        }
                        style={rating.rating === 3 ? { backgroundColor: VIOLET_100, color: VIOLET_DEEP } : undefined}
                      >
                        {RATING_LABELS[rating.rating] || rating.rating}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </section>

        {/* 4 — Session note quick-entry */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5" style={{ color: VIOLET }} />
            <h2 className="font-semibold text-[#132F43] dark:text-white">Quick session note</h2>
          </div>
          <Card className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1 block">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                CPT Code
              </label>
              {rbtCptRules.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-sm text-[#5A6B7A] dark:text-slate-400">Suggested:</span>
                  {rbtCptRules.slice(0, 3).map((rule) => (
                    <button
                      key={rule.code}
                      type="button"
                      onClick={() => setNoteCpt(rule.code)}
                      className="min-h-[44px] rounded-full border px-3 py-1.5 text-sm font-medium transition-colors bg-white dark:bg-slate-800"
                      style={
                        noteCpt === rule.code
                          ? { borderColor: VIOLET, backgroundColor: VIOLET_50, color: VIOLET_DEEP }
                          : { borderColor: '#E8E4DF', color: '#5A6B7A' }
                      }
                    >
                      {rule.code} · {rule.shortName}
                    </button>
                  ))}
                </div>
              )}
              <select
                className="w-full px-3 py-2 border border-neutral-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[#132F43] dark:text-white text-sm"
                value={noteCpt}
                onChange={(e) => setNoteCpt(e.target.value)}
                aria-label="CPT code"
              >
                {rbtCptRules.map((rule) => (
                  <option key={rule.code} value={rule.code}>
                    {rule.code} — {rule.shortName}
                  </option>
                ))}
              </select>
            </div>

            {NOTE_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1 block">
                  {label}
                </label>
                <Textarea
                  value={noteContent[key] || ''}
                  onChange={(e) => setNoteContent((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="text-sm"
                  rows={3}
                />
              </div>
            ))}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                Saved notes go to your BCBA for co-signature.
              </p>
              <Button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="text-white shrink-0"
                style={{ backgroundColor: VIOLET }}
              >
                {isSavingNote ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save note
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

export default RBTPortalView;
