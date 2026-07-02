import { describe, it, expect, vi } from 'vitest';

// Mock the supabase client — only fetchOutcomeTrend touches it and these tests
// exercise the pure mapper/formatter functions.
vi.mock('../utils/supabase/client', () => ({ supabase: {} }));

import {
  mapCheckInRows,
  parseBaselineRow,
  trendDirection,
  trendHeadline,
  shortBehaviorName,
  baselineFrequencyLabel,
  formatOutcomesForAI,
  type CheckInPoint,
} from '../lib/outcome-trends';

const mkPoint = (date: string, f: number | null, p: number | null, c: number | null): CheckInPoint => ({
  date, frequency: f, progress: p, confidence: c,
});

describe('mapCheckInRows', () => {
  it('maps canonical context rows and sorts chronologically', () => {
    const rows = [
      {
        context: { target_behavior_frequency: 2, goal_progress_rating: 4, parent_confidence_rating: 4 },
        created_at: '2026-06-28T10:00:00Z',
      },
      {
        context: { target_behavior_frequency: 4, goal_progress_rating: 2, parent_confidence_rating: 3 },
        created_at: '2026-06-14T10:00:00Z',
      },
    ];
    const points = mapCheckInRows(rows);
    expect(points).toHaveLength(2);
    expect(points[0].date).toBe('2026-06-14T10:00:00Z'); // oldest first
    expect(points[0]).toMatchObject({ frequency: 4, progress: 2, confidence: 3 });
    expect(points[1]).toMatchObject({ frequency: 2, progress: 4, confidence: 4 });
  });

  it('falls back to the legacy payload mirror when context is empty', () => {
    const rows = [{
      context: {},
      payload: { target_behavior_frequency: 3, goal_progress_rating: 3, parent_confidence_rating: 5 },
      recorded_at: '2026-06-21T09:00:00Z',
      created_at: '2026-06-21T09:00:01Z',
    }];
    const points = mapCheckInRows(rows);
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual(mkPoint('2026-06-21T09:00:00Z', 3, 3, 5));
  });

  it('prefers recorded_at over created_at and drops rows with no usable ratings', () => {
    const rows = [
      { context: { unrelated: true }, created_at: '2026-06-01T00:00:00Z' },
      { context: { goal_progress_rating: 5 }, recorded_at: '2026-06-08T00:00:00Z', created_at: '2026-06-09T00:00:00Z' },
    ];
    const points = mapCheckInRows(rows);
    expect(points).toHaveLength(1);
    expect(points[0].date).toBe('2026-06-08T00:00:00Z');
    expect(points[0].frequency).toBeNull();
    expect(points[0].progress).toBe(5);
  });

  it('clamps out-of-range and non-numeric ratings to null', () => {
    const rows = [{
      context: { target_behavior_frequency: 9, goal_progress_rating: 'oops', parent_confidence_rating: '4' },
      created_at: '2026-06-08T00:00:00Z',
    }];
    const [p] = mapCheckInRows(rows);
    expect(p.frequency).toBeNull();      // out of 1–5 range
    expect(p.progress).toBeNull();       // non-numeric
    expect(p.confidence).toBe(4);        // numeric string accepted
  });

  it('returns [] for null/empty input', () => {
    expect(mapCheckInRows(null)).toEqual([]);
    expect(mapCheckInRows([])).toEqual([]);
  });

  it('dedupes check-ins within the same ISO week — the latest one wins', () => {
    const rows = [
      { context: { goal_progress_rating: 2 }, created_at: '2026-06-22T08:00:00Z' }, // Mon
      { context: { goal_progress_rating: 5 }, created_at: '2026-06-24T08:00:00Z' }, // Wed, same week — supersedes
      { context: { goal_progress_rating: 3 }, created_at: '2026-06-29T08:00:00Z' }, // next week
    ];
    const points = mapCheckInRows(rows);
    expect(points).toHaveLength(2);
    expect(points[0].progress).toBe(5);
    expect(points[1].progress).toBe(3);
  });
});

describe('parseBaselineRow', () => {
  const interpretation = JSON.stringify({
    target_behavior: 'Meltdowns during transitions',
    baseline_frequency: 'few_daily',
    baseline_intensity: 4,
    primary_trigger: 'Transitions / changes in routine',
    ninety_day_goal: 'Transitions with a 5-minute warning',
    source: 'parent_baseline_assessment',
  });

  it('parses the JSON interpretation written by BaselineAssessment', () => {
    const b = parseBaselineRow({ interpretation, raw_score: 4, created_at: '2026-05-12T00:00:00Z' });
    expect(b).toMatchObject({
      targetBehavior: 'Meltdowns during transitions',
      frequency: 'few_daily',
      intensity: 4,
      trigger: 'Transitions / changes in routine',
      ninetyDayGoal: 'Transitions with a 5-minute warning',
      date: '2026-05-12T00:00:00Z',
    });
  });

  it('tolerates free-text interpretation (falls back to raw_score for intensity)', () => {
    const b = parseBaselineRow({ interpretation: 'Moderate concern noted.', raw_score: 3, created_at: '2026-05-12T00:00:00Z' });
    expect(b?.intensity).toBe(3);
    expect(b?.targetBehavior).toBeUndefined();
  });

  it('returns null for null/empty rows', () => {
    expect(parseBaselineRow(null)).toBeNull();
    expect(parseBaselineRow({ interpretation: null, raw_score: null, created_at: null })).toBeNull();
  });
});

describe('trendDirection', () => {
  it('needs at least 3 readings', () => {
    expect(trendDirection([4, 2], true)).toBeNull();
    expect(trendDirection([null, 4, null], true)).toBeNull();
  });

  it('detects improvement when a lower-is-better metric falls', () => {
    expect(trendDirection([4, 4, 3, 2], true)).toBe('improving');
  });

  it('detects improvement when a higher-is-better metric rises', () => {
    expect(trendDirection([2, 3, 4, 4], false)).toBe('improving');
  });

  it('flags "watch" when a lower-is-better metric rises', () => {
    expect(trendDirection([2, 2, 4, 4], true)).toBe('watch');
  });

  it('treats sub-half-point movement as steady (never dramatizes noise)', () => {
    expect(trendDirection([3, 3, 3, 3], true)).toBe('steady');
    expect(trendDirection([3, 4, 3, 4], false)).toBe('steady'); // heads 3.5 vs tail 3.5
  });
});

describe('trendHeadline (warm, no-shame copy)', () => {
  const improving = [
    mkPoint('2026-06-01', 4, 2, 2),
    mkPoint('2026-06-08', 3, 3, 3),
    mkPoint('2026-06-15', 2, 4, 4),
    mkPoint('2026-06-22', 2, 4, 4),
  ];
  const baseline = { targetBehavior: 'meltdowns during transitions, hitting' };

  it('invites the first check-in when there are no points', () => {
    expect(trendHeadline([], null)).toMatch(/first weekly check-in/i);
  });

  it('is honest about sparse data ("appears at 3")', () => {
    expect(trendHeadline(improving.slice(0, 2), null)).toBe('2 check-ins so far — your trend appears at 3.');
    expect(trendHeadline(improving.slice(0, 1), null)).toBe('1 check-in so far — your trend appears at 3.');
  });

  it('celebrates a falling behavior frequency using the baseline behavior name', () => {
    const h = trendHeadline(improving, baseline);
    expect(h).toBe('Meltdowns during transitions — trending down. That\'s real progress.');
  });

  it('never shames on a worsening trend — frames it as care-team information', () => {
    const rough = [
      mkPoint('2026-06-01', 2, 4, 4),
      mkPoint('2026-06-08', 3, 3, 3),
      mkPoint('2026-06-15', 4, 2, 3),
      mkPoint('2026-06-22', 4, 2, 3),
    ];
    const h = trendHeadline(rough, baseline);
    expect(h).toMatch(/care team/i);
    expect(h).not.toMatch(/worse|failing|declin|bad/i);
  });

  it('acknowledges steadiness warmly', () => {
    const flat = [
      mkPoint('2026-06-01', 3, 3, 3),
      mkPoint('2026-06-08', 3, 3, 3),
      mkPoint('2026-06-15', 3, 3, 3),
    ];
    expect(trendHeadline(flat, null)).toMatch(/steady/i);
  });
});

describe('shortBehaviorName / baselineFrequencyLabel', () => {
  it('takes the first clause, capitalizes, and caps length', () => {
    expect(shortBehaviorName('meltdowns during transitions, hitting siblings')).toBe('Meltdowns during transitions');
    expect(shortBehaviorName('  ')).toBeNull();
    expect(shortBehaviorName(undefined)).toBeNull();
    const long = shortBehaviorName('a'.repeat(60));
    expect(long!.length).toBeLessThanOrEqual(40);
    expect(long!.endsWith('…')).toBe(true);
  });

  it('maps baseline frequency option values to plain language', () => {
    expect(baselineFrequencyLabel('few_daily')).toBe('a few times a day');
    expect(baselineFrequencyLabel('unknown_value')).toBe('unknown value');
    expect(baselineFrequencyLabel(undefined)).toBeUndefined();
  });
});

describe('formatOutcomesForAI', () => {
  const points = [
    mkPoint('2026-06-14T10:00:00Z', 4, 2, 3),
    mkPoint('2026-06-28T10:00:00Z', 2, 4, 4),
    mkPoint('2026-06-21T10:00:00Z', 3, 3, 3),
  ];
  const baseline = {
    targetBehavior: 'Meltdowns during transitions',
    frequency: 'few_daily',
    intensity: 4,
    ninetyDayGoal: 'Transitions with a 5-minute warning',
    date: '2026-05-12T00:00:00Z',
  };

  it('returns empty string when there is nothing to say', () => {
    expect(formatOutcomesForAI([], null)).toBe('');
  });

  it('lists check-ins most-recent-first with real numbers and the baseline', () => {
    const s = formatOutcomesForAI(points, baseline);
    const jun28 = s.indexOf('Jun 28');
    const jun21 = s.indexOf('Jun 21');
    const jun14 = s.indexOf('Jun 14');
    expect(jun28).toBeGreaterThan(-1);
    expect(jun28).toBeLessThan(jun21);
    expect(jun21).toBeLessThan(jun14);
    expect(s).toContain('behavior freq 2/5');
    expect(s).toContain('goal progress 4/5');
    expect(s).toContain('confidence 4/5');
    expect(s).toContain('Baseline (May 12)');
    expect(s).toContain('a few times a day');
    expect(s).toContain('intensity 4/5');
    expect(s).toContain('90-day goal');
  });

  it('caps at 4 check-ins and 600 chars', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      mkPoint(`2026-06-${String(i + 10).padStart(2, '0')}T10:00:00Z`, 3, 3, 3));
    const bigBaseline = { ...baseline, targetBehavior: 'x'.repeat(500), ninetyDayGoal: 'y'.repeat(500) };
    const s = formatOutcomesForAI(many, bigBaseline);
    expect(s.length).toBeLessThanOrEqual(600);
    // 4 most recent only
    expect(s).toContain('Jun 19');
    expect(s).not.toContain('Jun 15');
  });

  it('skips null ratings instead of inventing numbers', () => {
    const s = formatOutcomesForAI([mkPoint('2026-06-28T10:00:00Z', null, 5, null)], null);
    expect(s).toContain('goal progress 5/5');
    expect(s).not.toContain('behavior freq');
    expect(s).not.toContain('confidence');
  });
});
