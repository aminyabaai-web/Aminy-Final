// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
//
// InlineTrendChart — a compact, REAL-data trend chart rendered inline in an AI
// chat bubble when the assistant emits a named [CHART:weekly_trend] (or
// [CHART:goal_progress]) token. Unlike AIChart's JSON [CHART:{...}] blocks
// (where the model supplies the numbers), this queries the signed-in user's
// actual `outcome_events` rows client-side (RLS-scoped), so the chart can never
// show hallucinated data. Uses recharts — the same chart library as the rest of
// the in-chat charting (AIChart.tsx).
//
// States: loading skeleton → chart (2+ points) → honest sparse message
// (<2 points) → null on any error (a broken chart must never break the
// message bubble).
//
// NOTE: container styling is inline (this repo precompiles Tailwind with no
// JIT — arbitrary classes like border-[#hex] silently don't paint).

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../utils/supabase/client';
import type { InlineChartKind } from '../../lib/chat-markdown';

interface TrendPoint {
  label: string;
  value: number;
}

interface InlineTrendChartProps {
  userId: string;
  kind?: InlineChartKind;
  childName?: string;
}

/** Shape written by WeeklyOutcomeCheckIn.tsx into outcome_events.payload */
interface CheckinPayload {
  target_behavior_frequency?: number | null;
  goal_progress_rating?: number | null;
  parent_confidence_rating?: number | null;
}

const CHART_COLOR = '#2A7D99'; // Aminy teal — matches AIChart's primary series

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function InlineTrendChart({ userId, kind = 'weekly_trend', childName }: InlineTrendChartProps) {
  const [points, setPoints] = useState<TrendPoint[] | null>(null); // null = loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Last 8 check-ins, oldest → newest for a left-to-right trend line.
        const { data, error } = await supabase
          .from('outcome_events')
          .select('created_at, payload')
          .eq('user_id', userId)
          .eq('event_type', 'weekly_parent_checkin')
          .order('created_at', { ascending: false })
          .limit(8);
        if (error) throw error;

        const rows = (data || []).slice().reverse(); // ascending by created_at
        const mapped: TrendPoint[] = [];
        for (const row of rows) {
          const p = (row.payload || {}) as CheckinPayload;
          const value = kind === 'goal_progress'
            ? p.goal_progress_rating
            : (p.target_behavior_frequency ?? p.goal_progress_rating);
          if (typeof value === 'number' && isFinite(value)) {
            mapped.push({ label: formatDay(String(row.created_at)), value });
          }
        }
        if (!cancelled) setPoints(mapped);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, kind]);

  // Errors → render nothing; the surrounding message text still reads fine.
  if (failed || !userId) return null;

  const name = childName || 'your child';
  const caption = kind === 'goal_progress'
    ? `${name}'s goal progress from weekly check-ins — higher means closer to the goal`
    : `${name}'s weekly check-ins — lower is calmer`;

  // Loading skeleton (~ same footprint as the chart so the bubble doesn't jump)
  if (points === null) {
    return (
      <div
        className="animate-pulse"
        style={{ margin: '8px 0', padding: '12px', background: '#ffffff', border: '1px solid #E8E4DF', borderRadius: '16px' }}
        aria-hidden="true"
      >
        <div style={{ height: '140px', borderRadius: '10px', background: '#EDF4F7' }} />
        <div style={{ height: '10px', width: '60%', marginTop: '8px', borderRadius: '9999px', background: '#EDF4F7' }} />
      </div>
    );
  }

  // Honest sparse state — never fake a trend out of one dot.
  if (points.length < 2) {
    return (
      <div
        style={{ margin: '8px 0', padding: '10px 12px', background: '#F6FBFB', border: '1px solid #E8E4DF', borderRadius: '12px', fontSize: '13px', lineHeight: 1.5, color: '#466379' }}
      >
        Not enough check-ins yet for a trend — this chart fills in weekly.
      </div>
    );
  }

  return (
    <div
      style={{ margin: '8px 0', padding: '12px', background: '#ffffff', border: '1px solid #E8E4DF', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={points} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={34} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={CHART_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLOR }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ margin: '6px 0 0', fontSize: '12px', lineHeight: 1.4, color: '#466379' }}>
        {caption}
      </p>
    </div>
  );
}

export default InlineTrendChart;
