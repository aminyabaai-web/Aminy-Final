// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * AI Proactive Nudge System
 * Surfaces the right action at the right moment based on real user data.
 * Pure async function — all nudge generators are independent and fail gracefully.
 */

import { supabase } from '../utils/supabase/client';
import { getAllComplianceRisks } from './rbt-supervision';

export interface ProactiveNudge {
  id: string;
  priority: 'urgent' | 'important' | 'helpful';
  type:
    | 'supervision_due'
    | 'auth_expiring'
    | 'medication_refill'
    | 'session_prep'
    | 'cosign_needed'
    | 'unsigned_note'
    | 'claim_action'
    | 'iep_step'
    | 'next_step';
  title: string;
  body: string;
  action: string;
  screenTarget: string;
  tabTarget?: string;
  data?: Record<string, unknown>;
}

// ── Individual nudge generators ──────────────────────────────────────────────

async function getSupervisionNudges(): Promise<ProactiveNudge[]> {
  const risks = getAllComplianceRisks();
  return risks.slice(0, 2).map((risk) => ({
    id: `supervision-${risk.rbtId}-${risk.type}`,
    priority: risk.severity === 'critical' ? 'urgent' : 'important',
    type: 'supervision_due' as const,
    title: `${risk.rbtName} — ${risk.type.replace(/-/g, ' ')}`,
    body: risk.message + (risk.daysRemaining !== undefined ? ` (${risk.daysRemaining} days left)` : ''),
    action: 'Schedule supervision',
    screenTarget: 'provider-portal',
    tabTarget: 'supervision',
    data: { rbtId: risk.rbtId },
  }));
}

async function getCosignNudges(providerId: string): Promise<ProactiveNudge[]> {
  const { data } = await supabase
    .from('session_notes')
    .select('id, patient_name:profiles!session_notes_patient_id_fkey(full_name), session_date')
    .eq('cosign_required', true)
    .is('cosigned_at', null)
    .eq('provider_id', providerId)
    .order('session_date', { ascending: false })
    .limit(3);

  if (!data?.length) return [];

  return [{
    id: 'cosign-pending',
    priority: 'important',
    type: 'cosign_needed',
    title: `${data.length} session note${data.length > 1 ? 's' : ''} need${data.length === 1 ? 's' : ''} your co-signature`,
    body: 'RBT-delivered sessions require BCBA co-signature before billing (CPT 97153)',
    action: 'Co-sign notes',
    screenTarget: 'provider-portal',
    tabTarget: 'clinical-notes',
    data: { count: data.length },
  }];
}

async function getUnsignedNoteNudges(providerId: string): Promise<ProactiveNudge[]> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data } = await supabase
    .from('session_notes')
    .select('id')
    .eq('provider_id', providerId)
    .eq('status', 'draft')
    .lt('session_date', yesterday.toISOString().split('T')[0])
    .limit(5);

  if (!data?.length) return [];

  return [{
    id: 'unsigned-notes',
    priority: 'important',
    type: 'unsigned_note',
    title: `${data.length} unsigned note${data.length > 1 ? 's' : ''} from previous sessions`,
    body: 'Notes older than 24 hours need to be signed and locked',
    action: 'Review notes',
    screenTarget: 'provider-portal',
    tabTarget: 'clinical-notes',
    data: { count: data.length },
  }];
}

async function getMedicationRefillNudges(userId: string): Promise<ProactiveNudge[]> {
  const sevenDaysOut = new Date();
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const { data } = await supabase
    .from('medications')
    .select('id, name, refill_date')
    .eq('user_id', userId)
    .lte('refill_date', sevenDaysOut.toISOString().split('T')[0])
    .gte('refill_date', new Date().toISOString().split('T')[0])
    .limit(3);

  if (!data?.length) return [];

  return data.map((med) => ({
    id: `med-refill-${med.id}`,
    priority: 'important' as const,
    type: 'medication_refill' as const,
    title: `${med.name} refill due soon`,
    body: `Refill date: ${med.refill_date}`,
    action: 'Update medication',
    screenTarget: 'medications',
    data: { medicationId: med.id },
  }));
}

async function getAuthExpiryNudges(userId: string): Promise<ProactiveNudge[]> {
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  const { data } = await supabase
    .from('coverage_authorizations')
    .select('id, service_type, end_date, remaining_units, authorized_units')
    .eq('user_id', userId)
    .lte('end_date', thirtyDaysOut.toISOString().split('T')[0])
    .gte('end_date', new Date().toISOString().split('T')[0])
    .limit(2);

  if (!data?.length) return [];

  return data.map((auth) => {
    const pctRemaining = auth.authorized_units
      ? Math.round((auth.remaining_units / auth.authorized_units) * 100)
      : null;
    const isLowUnits = pctRemaining !== null && pctRemaining < 20;
    return {
      id: `auth-expiry-${auth.id}`,
      priority: 'urgent' as const,
      type: 'auth_expiring' as const,
      title: `${auth.service_type} authorization expiring`,
      body: `Expires ${auth.end_date}${isLowUnits ? ` · Only ${pctRemaining}% of units remaining` : ''}`,
      action: 'Check benefits',
      screenTarget: 'benefits',
      data: { authId: auth.id },
    };
  });
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function getProactiveNudges(
  userId: string,
  userType: 'parent' | 'provider' = 'parent'
): Promise<ProactiveNudge[]> {
  const nudges: ProactiveNudge[] = [];

  const generators =
    userType === 'provider'
      ? [getSupervisionNudges(), getCosignNudges(userId), getUnsignedNoteNudges(userId)]
      : [getMedicationRefillNudges(userId), getAuthExpiryNudges(userId)];

  const results = await Promise.allSettled(generators);
  for (const result of results) {
    if (result.status === 'fulfilled') nudges.push(...result.value);
  }

  const priorityOrder = { urgent: 0, important: 1, helpful: 2 };
  return nudges
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 3);
}

export function formatNudgesForAI(nudges: ProactiveNudge[]): string {
  if (!nudges.length) return '';
  const lines = nudges.map((n) => {
    const navSpec = JSON.stringify({
      screen: n.screenTarget,
      ...(n.tabTarget ? { tab: n.tabTarget } : {}),
      label: n.action,
    });
    return `• **${n.title}** — ${n.body} [NAVIGATE:${navSpec}]`;
  });
  return `A few things need your attention:\n${lines.join('\n')}`;
}
