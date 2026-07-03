// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import { describe, it, expect } from 'vitest';
import {
  getDueScreenings,
  screeningScreenFor,
  readStoredConcerns,
  SCREENING_CPT_BY_INSTRUMENT,
  MAX_DUE_SCREENINGS,
  RESCREEN_AFTER_DAYS,
  type DueScreeningsInput,
} from './screening-schedule';
import { resolveRateCents } from './billing/cpt-registry';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

function base(overrides: Partial<DueScreeningsInput> = {}): DueScreeningsInput {
  return {
    childAgeMonths: null,
    concerns: [],
    completed: [],
    hasInsuranceOnFile: false,
    ...overrides,
  };
}

describe('getDueScreenings — age-window rules', () => {
  it('marks M-CHAT due (reason age) inside its 16-30mo window', () => {
    const due = getDueScreenings(base({ childAgeMonths: 20 }));
    const mchat = due.find((d) => d.instrumentId === 'mchat');
    expect(mchat).toBeDefined();
    expect(mchat!.reason).toBe('age');
    expect(mchat!.ageWindow).toBe('16–30 months');
  });

  it('does not mark M-CHAT due outside its age window', () => {
    const due = getDueScreenings(base({ childAgeMonths: 60 }));
    expect(due.find((d) => d.instrumentId === 'mchat')).toBeUndefined();
  });

  it('never returns age-based screenings when child age is unknown', () => {
    const due = getDueScreenings(base({ childAgeMonths: null }));
    expect(due.filter((d) => d.reason === 'age')).toHaveLength(0);
  });
});

describe('getDueScreenings — concern rules', () => {
  it('flags Vanderbilt for an ADHD concern (reason concern, 96127 when insured)', () => {
    const due = getDueScreenings(
      base({ childAgeMonths: 96, concerns: ['ADHD / Attention'], hasInsuranceOnFile: true }),
    );
    const vanderbilt = due.find((d) => d.instrumentId === 'vanderbilt');
    expect(vanderbilt).toBeDefined();
    expect(vanderbilt!.reason).toBe('concern');
    expect(vanderbilt!.concernTag).toBe('ADHD / Attention');
    expect(vanderbilt!.billable?.cpt).toBe('96127');
  });

  it('routes free-text concerns through the keyword router', () => {
    const due = getDueScreenings(
      base({ childAgeMonths: 96, concerns: ["can't sit still and very hyperactive"] }),
    );
    expect(due.find((d) => d.instrumentId === 'vanderbilt')).toBeDefined();
  });

  it('respects the child age window for concern-flagged child instruments', () => {
    // Vanderbilt is 72-144mo; a 36mo child should not get it even with the concern
    const due = getDueScreenings(base({ childAgeMonths: 36, concerns: ['ADHD / Attention'] }));
    expect(due.find((d) => d.instrumentId === 'vanderbilt')).toBeUndefined();
  });

  it('caregiver PHQ-9 is exempt from child-age gating and never billable (no 96161 in registry)', () => {
    const due = getDueScreenings(
      base({
        childAgeMonths: 36,
        concerns: ['Caregiver / Parent Mental Health'],
        hasInsuranceOnFile: true,
      }),
    );
    const phq9 = due.find((d) => d.instrumentId === 'phq-9');
    expect(phq9).toBeDefined();
    expect(phq9!.reason).toBe('concern');
    expect(phq9!.billable).toBeNull();
    expect(SCREENING_CPT_BY_INSTRUMENT['phq-9']).toBeNull();
  });
});

describe('getDueScreenings — 180-day rescreen rule', () => {
  it('suppresses an instrument completed within 180 days', () => {
    const due = getDueScreenings(
      base({
        childAgeMonths: 20,
        completed: [{ instrumentId: 'mchat', completedAt: daysAgo(30) }],
      }),
    );
    expect(due.find((d) => d.instrumentId === 'mchat')).toBeUndefined();
  });

  it('converts to reason rescreen when the last completion is older than 180 days', () => {
    const due = getDueScreenings(
      base({
        childAgeMonths: 20,
        completed: [{ instrumentId: 'mchat', completedAt: daysAgo(RESCREEN_AFTER_DAYS + 20) }],
      }),
    );
    const mchat = due.find((d) => d.instrumentId === 'mchat');
    expect(mchat).toBeDefined();
    expect(mchat!.reason).toBe('rescreen');
    expect(mchat!.lastCompletedAt).toBeTruthy();
  });

  it('re-surfaces a stale completion even without an age/concern trigger', () => {
    // PSC completed 200 days ago; child 8y (in PSC window), no concerns
    const due = getDueScreenings(
      base({
        childAgeMonths: 96,
        completed: [{ instrumentId: 'psc', completedAt: daysAgo(200) }],
      }),
    );
    const psc = due.find((d) => d.instrumentId === 'psc');
    expect(psc).toBeDefined();
    expect(psc!.reason).toBe('rescreen');
  });

  it('uses the MOST RECENT completion when several exist', () => {
    const due = getDueScreenings(
      base({
        childAgeMonths: 20,
        completed: [
          { instrumentId: 'mchat', completedAt: daysAgo(300) },
          { instrumentId: 'mchat', completedAt: daysAgo(10) },
        ],
      }),
    );
    expect(due.find((d) => d.instrumentId === 'mchat')).toBeUndefined();
  });
});

describe('getDueScreenings — insurance gates billable', () => {
  it('billable is null for every item without insurance on file', () => {
    const due = getDueScreenings(
      base({ childAgeMonths: 20, concerns: ['ADHD / Attention'], hasInsuranceOnFile: false }),
    );
    expect(due.length).toBeGreaterThan(0);
    for (const d of due) expect(d.billable).toBeNull();
  });

  it('with insurance, billable carries CPT + registry-resolved cents + provider-review flag', () => {
    const due = getDueScreenings(base({ childAgeMonths: 20, hasInsuranceOnFile: true }));
    const mchat = due.find((d) => d.instrumentId === 'mchat');
    expect(mchat?.billable).not.toBeNull();
    expect(mchat!.billable!.cpt).toBe('96110');
    expect(mchat!.billable!.requiresProviderReview).toBe(true);
    expect(mchat!.billable!.estReimbursementCents).toBe(resolveRateCents('96110'));
    expect(mchat!.billable!.estReimbursementCents).toBeGreaterThan(0);
  });

  it('96127 cents come from the CPT registry and are non-zero', () => {
    const due = getDueScreenings(
      base({ childAgeMonths: 96, concerns: ['ADHD / Attention'], hasInsuranceOnFile: true }),
    );
    const vanderbilt = due.find((d) => d.instrumentId === 'vanderbilt');
    const registryCents = resolveRateCents('96127');
    expect(registryCents).toBeGreaterThan(0);
    expect(vanderbilt!.billable!.estReimbursementCents).toBe(registryCents);
  });
});

describe('getDueScreenings — cap and priority order', () => {
  it(`caps the list at ${MAX_DUE_SCREENINGS}`, () => {
    const due = getDueScreenings(
      base({
        childAgeMonths: 96,
        concerns: [
          'ADHD / Attention',
          'Anxiety',
          'Depression / Mood',
          'Behavioral Concerns',
          'Caregiver / Parent Mental Health',
        ],
      }),
    );
    expect(due.length).toBeLessThanOrEqual(MAX_DUE_SCREENINGS);
    expect(due.length).toBe(MAX_DUE_SCREENINGS);
  });

  it('orders concern > age > rescreen with ascending priority numbers', () => {
    const due = getDueScreenings(
      base({
        childAgeMonths: 20, // M-CHAT + CSBS age window (CSBS max 24mo)
        concerns: ['Caregiver / Parent Mental Health'], // phq-9 concern
        completed: [{ instrumentId: 'csbs', completedAt: daysAgo(200) }], // csbs → rescreen
      }),
    );
    const reasons = due.map((d) => d.reason);
    expect(reasons[0]).toBe('concern');
    expect(reasons).toEqual(
      [...reasons].sort(
        (a, b) =>
          ({ concern: 1, age: 2, rescreen: 3 })[a] - ({ concern: 1, age: 2, rescreen: 3 })[b],
      ),
    );
    const priorities = due.map((d) => d.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
    expect(due[0].priority).toBe(1);
    // The stale CSBS completion must surface as a rescreen, not age
    expect(due.find((d) => d.instrumentId === 'csbs')?.reason).toBe('rescreen');
  });

  it('is defensive about malformed inputs', () => {
    const due = getDueScreenings({
      childAgeMonths: 20,
      // @ts-expect-error — funnel data may be absent/garbage on old payloads
      concerns: undefined,
      // @ts-expect-error — same for completions
      completed: undefined,
      hasInsuranceOnFile: false,
    });
    expect(due.find((d) => d.instrumentId === 'mchat')).toBeDefined();
  });
});

describe('screeningScreenFor', () => {
  it('routes mchat to the dedicated M-CHAT screen, everything else to the AI screener', () => {
    expect(screeningScreenFor('mchat')).toBe('mchat-screening');
    expect(screeningScreenFor('vanderbilt')).toBe('developmental-screener');
    expect(screeningScreenFor('psc')).toBe('developmental-screener');
  });
});

describe('readStoredConcerns', () => {
  it('reads concerns + primaryConcern defensively and dedupes', () => {
    localStorage.setItem(
      'aminy_screening_results',
      JSON.stringify({ concerns: ['ADHD / Attention', 'Anxiety'], primaryConcern: 'ADHD / Attention' }),
    );
    expect(readStoredConcerns()).toEqual(['ADHD / Attention', 'Anxiety']);
    localStorage.removeItem('aminy_screening_results');
  });

  it('returns [] for legacy array payloads and malformed JSON', () => {
    localStorage.setItem('aminy_screening_results', JSON.stringify([{ question: 'q', answer: 'a' }]));
    expect(readStoredConcerns()).toEqual([]);
    localStorage.setItem('aminy_screening_results', '{not json');
    expect(readStoredConcerns()).toEqual([]);
    localStorage.removeItem('aminy_screening_results');
  });
});
