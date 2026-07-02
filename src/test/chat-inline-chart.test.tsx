/**
 * Inline chart token protocol tests — the named-render-token splitter behind
 * [CHART:weekly_trend] in AI chat bubbles (Feature: Bevel-style inline charts).
 *
 * Contract: splitInlineChartTokens carves a message's text into text + chart
 * segments. Known [CHART:name] tokens become chart segments (rendered by
 * InlineTrendChart from the user's REAL outcome_events data); unrecognized
 * [TAG:name] tokens are stripped so a hallucinated token never leaks into the
 * visible message; markdown links and JSON [CHART:{...}] blocks (handled
 * upstream by parseAIResponseParts) pass through untouched.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { splitInlineChartTokens } from '../lib/chat-markdown';

describe('splitInlineChartTokens — text only', () => {
  it('returns a single text segment for plain prose', () => {
    const text = 'Kai had a calmer week — two fewer meltdowns than last week.';
    expect(splitInlineChartTokens(text)).toEqual([{ type: 'text', content: text }]);
  });

  it('leaves markdown links untouched (label:name shape followed by parens)', () => {
    const text = 'See [OUR:guide](https://example.com/guide) for details.';
    expect(splitInlineChartTokens(text)).toEqual([{ type: 'text', content: text }]);
  });

  it('leaves JSON [CHART:{...}] blocks untouched (handled by parseAIResponseParts upstream)', () => {
    const text = 'Here: [CHART:{"type":"bar","data":[{"week":"Wk1","n":3}]}] done.';
    expect(splitInlineChartTokens(text)).toEqual([{ type: 'text', content: text }]);
  });
});

describe('splitInlineChartTokens — known chart tokens', () => {
  it('splits a token mid-message into text / chart / text', () => {
    const segs = splitInlineChartTokens(
      "Here's how things are trending:\n[CHART:weekly_trend]\nLower bars mean calmer weeks."
    );
    expect(segs).toEqual([
      { type: 'text', content: "Here's how things are trending:" },
      { type: 'chart', chart: 'weekly_trend' },
      { type: 'text', content: 'Lower bars mean calmer weeks.' },
    ]);
  });

  it('handles a token at the end of the message', () => {
    const segs = splitInlineChartTokens('Progress so far:\n[CHART:goal_progress]');
    expect(segs).toEqual([
      { type: 'text', content: 'Progress so far:' },
      { type: 'chart', chart: 'goal_progress' },
    ]);
  });

  it('handles a message that is only a token', () => {
    expect(splitInlineChartTokens('[CHART:weekly_trend]')).toEqual([
      { type: 'chart', chart: 'weekly_trend' },
    ]);
  });

  it('handles two tokens in one message', () => {
    const segs = splitInlineChartTokens('[CHART:weekly_trend] and also [CHART:goal_progress]');
    expect(segs).toEqual([
      { type: 'chart', chart: 'weekly_trend' },
      { type: 'text', content: 'and also' },
      { type: 'chart', chart: 'goal_progress' },
    ]);
  });
});

describe('splitInlineChartTokens — unknown tokens strip gracefully', () => {
  it('strips an unrecognized [CHART:name] without breaking surrounding text', () => {
    const segs = splitInlineChartTokens('Before [CHART:made_up_chart] after.');
    expect(segs).toEqual([
      { type: 'text', content: 'Before' },
      { type: 'text', content: 'after.' },
    ]);
  });

  it('strips an unrecognized [TAG:name] token entirely', () => {
    const segs = splitInlineChartTokens('Look: [WIDGET:sparkline] neat.');
    expect(segs).toEqual([
      { type: 'text', content: 'Look:' },
      { type: 'text', content: 'neat.' },
    ]);
    expect(JSON.stringify(segs)).not.toContain('WIDGET');
  });

  it('a message that is ONLY an unknown token renders no visible text', () => {
    const segs = splitInlineChartTokens('[FOO:bar]');
    expect(segs.filter(s => s.type === 'text' && s.content.trim())).toHaveLength(0);
  });
});

// ─── InlineTrendChart render states (real-data chart component) ──────────────

const queryResult = vi.hoisted(() => ({ current: { data: [] as unknown[], error: null as unknown } }));

vi.mock('../utils/supabase/client', () => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(queryResult.current)),
  };
  return { supabase: { from: vi.fn(() => chain) } };
});

import { InlineTrendChart } from '../components/chat/InlineTrendChart';

describe('InlineTrendChart — honest states', () => {
  it('shows the gentle sparse message when fewer than 2 check-ins exist', async () => {
    queryResult.current = {
      data: [
        { created_at: '2026-06-24T10:00:00Z', payload: { target_behavior_frequency: 3 } },
      ],
      error: null,
    };
    const { getByText } = render(<InlineTrendChart userId="user-1" />);
    await waitFor(() =>
      expect(getByText(/Not enough check-ins yet for a trend/)).toBeTruthy()
    );
  });

  it('renders the caption once 2+ real points load', async () => {
    queryResult.current = {
      data: [
        { created_at: '2026-06-24T10:00:00Z', payload: { target_behavior_frequency: 5 } },
        { created_at: '2026-06-17T10:00:00Z', payload: { target_behavior_frequency: 3 } },
      ],
      error: null,
    };
    const { getByText } = render(<InlineTrendChart userId="user-1" childName="Kai" />);
    await waitFor(() =>
      expect(getByText(/Kai's weekly check-ins — lower is calmer/)).toBeTruthy()
    );
  });

  it('renders nothing on a query error (never breaks the message bubble)', async () => {
    queryResult.current = { data: [], error: new Error('rls denied') };
    const { container } = render(<InlineTrendChart userId="user-1" />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });
});
