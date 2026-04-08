// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Screener Service
 * Saves PHQ-9, GAD-7, and BRIEF-2 results to localStorage + Supabase outcomes_tracking.
 */

import { supabase } from '../utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────

export type ScreenerInstrument = 'PHQ-9' | 'GAD-7' | 'BRIEF-2';

export type PHQ9Severity = 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
export type GAD7Severity = 'minimal' | 'mild' | 'moderate' | 'severe';
export type BRIEF2Elevation = 'At Risk' | 'Borderline' | 'Elevated';

export type ScreenerSeverity = PHQ9Severity | GAD7Severity | BRIEF2Elevation;

export interface ScreenerResult {
  instrument: ScreenerInstrument;
  score: number;
  severity: ScreenerSeverity;
  date: string;       // ISO date string
  childId: string;
  respondentId?: string;
  meta?: Record<string, unknown>;
}

export type ScoreTrend = 'improving' | 'stable' | 'worsening' | 'insufficient_data';

// ─── Local storage key ────────────────────────────────────────────────

const LS_KEY = 'aminy_screener_results';

function readLocalResults(): ScreenerResult[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as ScreenerResult[]) : [];
  } catch {
    return [];
  }
}

function writeLocalResults(results: ScreenerResult[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(results));
  } catch {
    // silently ignore quota errors
  }
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Save a screener result to localStorage (always) and Supabase (best-effort).
 */
export async function saveScreenerResult(result: ScreenerResult): Promise<void> {
  // 1. Save to localStorage
  const existing = readLocalResults();
  existing.unshift(result); // newest first
  writeLocalResults(existing.slice(0, 200)); // cap at 200 records

  // 2. Attempt Supabase save
  try {
    await supabase.from('outcomes_tracking').insert({
      child_id: result.childId,
      instrument: result.instrument,
      score: result.score,
      severity: result.severity,
      assessed_at: result.date,
      respondent_id: result.respondentId ?? null,
      meta: result.meta ?? null,
    });
  } catch {
    // Supabase not configured in dev — silent fail
  }
}

/**
 * Return all past results for a child + instrument, newest first.
 */
export function getScreenerHistory(childId: string, instrument: ScreenerInstrument): ScreenerResult[] {
  return readLocalResults().filter(
    (r) => r.childId === childId && r.instrument === instrument
  );
}

/**
 * Return the most recent result for a child + instrument, or null.
 */
export function getLatestScore(
  childId: string,
  instrument: ScreenerInstrument
): ScreenerResult | null {
  const history = getScreenerHistory(childId, instrument);
  return history.length > 0 ? history[0] : null;
}

/**
 * Determine score trend based on last 3 results.
 * Lower score = improvement for PHQ-9 / GAD-7.
 * Higher score = worsening for BRIEF-2 (larger = more concerns).
 */
export function getScoreTrend(childId: string, instrument: ScreenerInstrument): ScoreTrend {
  const history = getScreenerHistory(childId, instrument);
  if (history.length < 2) return 'insufficient_data';

  const newest = history[0].score;
  const previous = history[1].score;
  const delta = newest - previous;

  if (Math.abs(delta) <= 1) return 'stable';

  // For all supported instruments, lower score = better outcome
  if (delta < 0) return 'improving';
  return 'worsening';
}

// ─── Severity helpers ─────────────────────────────────────────────────

export function phq9Severity(score: number): PHQ9Severity {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  if (score <= 19) return 'moderately_severe';
  return 'severe';
}

export function phq9SeverityLabel(severity: PHQ9Severity): string {
  const map: Record<PHQ9Severity, string> = {
    minimal: 'Minimal',
    mild: 'Mild',
    moderate: 'Moderate',
    moderately_severe: 'Moderately Severe',
    severe: 'Severe',
  };
  return map[severity];
}

export function gad7Severity(score: number): GAD7Severity {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
}

export function brief2Elevation(score: number, maxScore: number): BRIEF2Elevation {
  const pct = score / maxScore;
  if (pct >= 0.75) return 'At Risk';
  if (pct >= 0.55) return 'Borderline';
  return 'Elevated';
}

// ─── Demo data (used when no real history exists) ─────────────────────

export function getDemoHistory(instrument: ScreenerInstrument): ScreenerResult[] {
  const childId = 'demo-child';
  const now = new Date();

  const makeDate = (daysAgo: number) =>
    new Date(now.getTime() - daysAgo * 86400000).toISOString();

  if (instrument === 'PHQ-9') {
    return [
      { instrument, score: 8, severity: 'mild', date: makeDate(7), childId },
      { instrument, score: 11, severity: 'moderate', date: makeDate(35), childId },
      { instrument, score: 14, severity: 'moderate', date: makeDate(63), childId },
    ];
  }
  if (instrument === 'GAD-7') {
    return [
      { instrument, score: 6, severity: 'mild', date: makeDate(7), childId },
      { instrument, score: 9, severity: 'mild', date: makeDate(35), childId },
      { instrument, score: 13, severity: 'moderate', date: makeDate(63), childId },
    ];
  }
  // BRIEF-2
  return [
    { instrument, score: 10, severity: 'Borderline', date: makeDate(7), childId },
    { instrument, score: 13, severity: 'At Risk', date: makeDate(35), childId },
    { instrument, score: 15, severity: 'At Risk', date: makeDate(63), childId },
  ];
}
