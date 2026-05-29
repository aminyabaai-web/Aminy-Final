// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * CE Credit Tracking — BCBA + RBT continuing-education credit ledger.
 *
 * BACB (Behavior Analyst Certification Board) re-certification cycles:
 *   - BCBA: 32 CE credits per 2-year cycle (4 ethics, 3 supervision if applicable)
 *   - BCaBA: 20 credits per 2-year cycle
 *   - RBT:   3 credits per 1-year cycle
 *
 * AKA: Aminy tracks credits → warns providers when behind → blocks
 * dispatch to AskAminy queue if expired (compliance protection).
 */

import { supabase } from '../utils/supabase/client';

export type CertType = 'BCBA' | 'BCaBA' | 'RBT' | 'LMFT' | 'LCSW' | 'Psychologist';
export type CreditType = 'general' | 'ethics' | 'supervision' | 'cultural_diversity' | 'other';

export interface CECredit {
  id: string;
  providerId: string;
  courseName: string;
  providerOrg?: string;
  creditType: CreditType;
  creditHours: number;
  completedAt: string;
  certificateUrl?: string;
  expiresAt?: string;
  recertCycle?: string;
}

/** Cycle requirements by cert type */
export const CYCLE_REQUIREMENTS: Record<CertType, {
  totalHours: number;
  ethicsHours: number;
  supervisionHours: number;
  cycleYears: number;
}> = {
  BCBA:         { totalHours: 32, ethicsHours: 4, supervisionHours: 3,  cycleYears: 2 },
  BCaBA:        { totalHours: 20, ethicsHours: 3, supervisionHours: 0,  cycleYears: 2 },
  RBT:          { totalHours: 3,  ethicsHours: 0, supervisionHours: 0,  cycleYears: 1 },
  LMFT:         { totalHours: 30, ethicsHours: 6, supervisionHours: 0,  cycleYears: 2 },
  LCSW:         { totalHours: 30, ethicsHours: 4, supervisionHours: 0,  cycleYears: 2 },
  Psychologist: { totalHours: 40, ethicsHours: 4, supervisionHours: 0,  cycleYears: 2 },
};

export interface CycleProgress {
  certType: CertType;
  cycleStart: string;
  cycleEnd: string;
  required: { total: number; ethics: number; supervision: number };
  completed: { total: number; ethics: number; supervision: number };
  remaining: { total: number; ethics: number; supervision: number };
  percentComplete: number;
  daysUntilCycleEnd: number;
  status: 'on_track' | 'behind' | 'at_risk' | 'overdue' | 'complete';
}

/** Log a new CE credit. */
export async function logCECredit(input: Omit<CECredit, 'id'>): Promise<CECredit> {
  const { data, error } = await supabase
    .from('provider_ce_credits')
    .insert({
      provider_id: input.providerId,
      course_name: input.courseName,
      provider_org: input.providerOrg,
      credit_type: input.creditType,
      credit_hours: input.creditHours,
      completed_at: input.completedAt,
      certificate_url: input.certificateUrl,
      expires_at: input.expiresAt,
      recert_cycle: input.recertCycle,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

/** Get all CE credits for a provider, newest first. */
export async function listCECredits(providerId: string): Promise<CECredit[]> {
  const { data } = await supabase
    .from('provider_ce_credits')
    .select('*')
    .eq('provider_id', providerId)
    .order('completed_at', { ascending: false });
  return (data || []).map(mapRow);
}

/**
 * Calculate cycle progress for a provider's current recert cycle.
 * Drives the dashboard widget showing "X of 32 hours · 8 months left".
 */
export async function getCycleProgress(
  providerId: string,
  certType: CertType,
  cycleStartIso: string,
): Promise<CycleProgress> {
  const req = CYCLE_REQUIREMENTS[certType];
  const cycleStart = new Date(cycleStartIso);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setFullYear(cycleEnd.getFullYear() + req.cycleYears);

  const { data: credits } = await supabase
    .from('provider_ce_credits')
    .select('credit_type, credit_hours, completed_at')
    .eq('provider_id', providerId)
    .gte('completed_at', cycleStart.toISOString())
    .lte('completed_at', cycleEnd.toISOString());

  const completed = (credits || []).reduce(
    (acc, c: any) => {
      acc.total += Number(c.credit_hours);
      if (c.credit_type === 'ethics')      acc.ethics += Number(c.credit_hours);
      if (c.credit_type === 'supervision') acc.supervision += Number(c.credit_hours);
      return acc;
    },
    { total: 0, ethics: 0, supervision: 0 }
  );

  const remaining = {
    total: Math.max(0, req.totalHours - completed.total),
    ethics: Math.max(0, req.ethicsHours - completed.ethics),
    supervision: Math.max(0, req.supervisionHours - completed.supervision),
  };

  const percentComplete = Math.min(100, Math.round((completed.total / req.totalHours) * 100));
  const daysUntilCycleEnd = Math.ceil((cycleEnd.getTime() - Date.now()) / 86_400_000);

  // Status logic — "at risk" if behind expected pace
  const cycleDays = req.cycleYears * 365;
  const elapsedDays = cycleDays - daysUntilCycleEnd;
  const expectedComplete = Math.round((elapsedDays / cycleDays) * req.totalHours);

  let status: CycleProgress['status'];
  if (completed.total >= req.totalHours && remaining.ethics === 0 && remaining.supervision === 0) {
    status = 'complete';
  } else if (daysUntilCycleEnd < 0) {
    status = 'overdue';
  } else if (completed.total < expectedComplete * 0.5 && daysUntilCycleEnd < 90) {
    status = 'at_risk';
  } else if (completed.total < expectedComplete - 4) {
    status = 'behind';
  } else {
    status = 'on_track';
  }

  return {
    certType,
    cycleStart: cycleStart.toISOString(),
    cycleEnd: cycleEnd.toISOString(),
    required: { total: req.totalHours, ethics: req.ethicsHours, supervision: req.supervisionHours },
    completed,
    remaining,
    percentComplete,
    daysUntilCycleEnd,
    status,
  };
}

function mapRow(r: any): CECredit {
  return {
    id: r.id,
    providerId: r.provider_id,
    courseName: r.course_name,
    providerOrg: r.provider_org,
    creditType: r.credit_type,
    creditHours: Number(r.credit_hours),
    completedAt: r.completed_at,
    certificateUrl: r.certificate_url,
    expiresAt: r.expires_at,
    recertCycle: r.recert_cycle,
  };
}
