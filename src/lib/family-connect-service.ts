// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Family Connect service — parent-mediated family matching ("the village").
 *
 * Wraps the existing scoring engine in src/lib/community.ts
 * (calculateMatchScore) and adapts it to the privacy-first
 * family_connect_profiles shape: first names only, child AGE BANDS (never
 * exact ages), state-level location only, focus areas + interests chips.
 *
 * Parents connect with parents. Kids never contact each other through this
 * surface — that is a product decision, not a gap.
 */

import { supabase } from '../utils/supabase/client';
import { calculateMatchScore, type FamilyProfile } from './community';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConnectProfile {
  userId: string;
  optedIn: boolean;
  displayName: string;
  state: string | null;
  childAgeBand: string | null;
  focusAreas: string[];
  interests: string[];
  bioLine: string | null;
  createdAt: string;
}

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface FamilyConnection {
  id: string;
  requesterId: string;
  recipientId: string;
  status: ConnectionStatus;
  message: string | null;
  createdAt: string;
}

export interface ScoredMatch {
  profile: ConnectProfile;
  score: number;
  reasons: string[];
  sharedFocusAreas: string[];
  sharedInterests: string[];
  sameState: boolean;
  sameAgeBand: boolean;
}

// ── Age bands — never exact ages ─────────────────────────────────────────────

export const AGE_BANDS = ['0-3', '4-6', '7-9', '10-12', '13-17', '18+'] as const;

/** Map a real age (from children.age_years) to its band for prefill. */
export function ageToBand(age: number | null | undefined): string | null {
  if (age == null || Number.isNaN(age)) return null;
  if (age <= 3) return '0-3';
  if (age <= 6) return '4-6';
  if (age <= 9) return '7-9';
  if (age <= 12) return '10-12';
  if (age <= 17) return '13-17';
  return '18+';
}

/** Representative age for scoring (band midpoint) — feeds the shared engine. */
function bandMidpoint(band: string | null): number[] {
  switch (band) {
    case '0-3': return [2];
    case '4-6': return [5];
    case '7-9': return [8];
    case '10-12': return [11];
    case '13-17': return [15];
    case '18+': return [19];
    default: return [];
  }
}

/** Enforce first-name-only on save: first word, trimmed, capped length. */
export function toFirstNameOnly(name: string): string {
  return (name || '').trim().split(/\s+/)[0]?.slice(0, 30) || '';
}

// ── Scoring — reuse the community.ts engine, warm village-voiced reasons ─────

function toEngineProfile(p: ConnectProfile): FamilyProfile {
  return {
    userId: p.userId,
    displayName: p.displayName,
    childAges: bandMidpoint(p.childAgeBand),
    // The engine weights diagnoses (30) above concerns (25); our focus areas
    // are the journey-shaped signal, interests the lighter one — map accordingly.
    childDiagnoses: p.focusAreas,
    primaryConcerns: p.interests,
    location: p.state ? { city: '', state: p.state } : undefined,
    memberSince: p.createdAt,
    isDiscoverable: p.optedIn,
    matchingPreferences: {
      wantsSimilarAge: true,
      wantsSimilarDiagnosis: true,
      wantsLocalMatches: true,
    },
  };
}

const overlap = (a: string[], b: string[]) => {
  const set = new Set(b.map(x => x.toLowerCase()));
  return a.filter(x => set.has(x.toLowerCase()));
};

/**
 * Score one candidate against the viewer's profile. Score comes from the
 * existing engine; reason strings are rebuilt here because the engine's
 * phrasing assumes city-level location and clinical diagnosis labels we
 * deliberately do not collect on this surface.
 */
export function scoreConnectMatch(mine: ConnectProfile, theirs: ConnectProfile): ScoredMatch {
  const { score } = calculateMatchScore(toEngineProfile(mine), toEngineProfile(theirs));

  const sharedFocusAreas = overlap(theirs.focusAreas, mine.focusAreas);
  const sharedInterests = overlap(theirs.interests, mine.interests);
  const sameState = !!mine.state && !!theirs.state && mine.state === theirs.state;
  const sameAgeBand = !!mine.childAgeBand && mine.childAgeBand === theirs.childAgeBand;

  const reasons: string[] = [];
  if (sameAgeBand) reasons.push('Kids in the same age range');
  if (sharedFocusAreas.length > 0) reasons.push(`Also navigating ${sharedFocusAreas.slice(0, 2).join(' and ')}`);
  if (sharedInterests.length > 0) reasons.push(`Kids who both love ${sharedInterests.slice(0, 2).join(' and ')}`);
  if (sameState) reasons.push(`Also in ${theirs.state}`);
  if (reasons.length === 0) reasons.push('A family walking a similar road');

  return { profile: theirs, score, reasons, sharedFocusAreas, sharedInterests, sameState, sameAgeBand };
}

/**
 * Score, filter, and order candidates for the viewer. Blocked users are
 * excluded server-side by RLS (both directions) AND client-side via the
 * caller-supplied set (covers instant/local-only blocks).
 */
export function rankConnectMatches(
  mine: ConnectProfile,
  candidates: ConnectProfile[],
  excludeUserIds: Set<string>
): ScoredMatch[] {
  return candidates
    .filter(c => c.optedIn && c.userId !== mine.userId && !excludeUserIds.has(c.userId))
    .map(c => scoreConnectMatch(mine, c))
    .sort((a, b) => b.score - a.score);
}

// ── Data access ──────────────────────────────────────────────────────────────

interface ConnectProfileRow {
  user_id: string;
  opted_in: boolean;
  display_name: string;
  state: string | null;
  child_age_band: string | null;
  focus_areas: string[] | null;
  interests: string[] | null;
  bio_line: string | null;
  created_at: string;
}

const fromRow = (r: ConnectProfileRow): ConnectProfile => ({
  userId: r.user_id,
  optedIn: r.opted_in,
  displayName: r.display_name,
  state: r.state,
  childAgeBand: r.child_age_band,
  focusAreas: r.focus_areas || [],
  interests: r.interests || [],
  bioLine: r.bio_line,
  createdAt: r.created_at,
});

export async function getMyConnectProfile(userId: string): Promise<ConnectProfile | null> {
  const { data, error } = await supabase
    .from('family_connect_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data as ConnectProfileRow);
}

export async function upsertConnectProfile(profile: {
  userId: string;
  optedIn: boolean;
  displayName: string;
  state?: string | null;
  childAgeBand?: string | null;
  focusAreas?: string[];
  interests?: string[];
  bioLine?: string | null;
}): Promise<boolean> {
  const { error } = await supabase.from('family_connect_profiles').upsert(
    {
      user_id: profile.userId,
      opted_in: profile.optedIn,
      display_name: toFirstNameOnly(profile.displayName) || 'Parent',
      state: profile.state || null,
      child_age_band: profile.childAgeBand || null,
      focus_areas: profile.focusAreas || [],
      interests: profile.interests || [],
      bio_line: profile.bioLine?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  return !error;
}

/** Leave Family Connect: hide the card, keep the row so re-joining is one tap. */
export async function optOutOfConnect(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('family_connect_profiles')
    .update({ opted_in: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  return !error;
}

/** All opted-in profiles the viewer may see (RLS excludes blocks both ways). */
export async function getCandidateProfiles(userId: string): Promise<ConnectProfile[]> {
  const { data, error } = await supabase
    .from('family_connect_profiles')
    .select('*')
    .eq('opted_in', true)
    .neq('user_id', userId)
    .limit(100);
  if (error || !data) return [];
  return (data as ConnectProfileRow[]).map(fromRow);
}

export async function getMyConnections(userId: string): Promise<FamilyConnection[]> {
  const { data, error } = await supabase
    .from('family_connections')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: { id: string; requester_id: string; recipient_id: string; status: ConnectionStatus; message: string | null; created_at: string }) => ({
    id: r.id,
    requesterId: r.requester_id,
    recipientId: r.recipient_id,
    status: r.status,
    message: r.message,
    createdAt: r.created_at,
  }));
}

export async function sendConnectionRequest(
  requesterId: string,
  recipientId: string,
  message?: string
): Promise<boolean> {
  const { error } = await supabase.from('family_connections').insert({
    requester_id: requesterId,
    recipient_id: recipientId,
    message: message?.trim() || null,
  });
  return !error;
}

/**
 * Recipient responds. A decline is SILENT: the requester's UI keeps showing
 * 'hello sent' (it never renders the declined status) — no rejection
 * notifications, ever.
 */
export async function respondToConnection(
  connectionId: string,
  status: 'accepted' | 'declined'
): Promise<boolean> {
  const { error } = await supabase
    .from('family_connections')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', connectionId);
  return !error;
}
