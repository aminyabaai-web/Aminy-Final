// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export interface AIChartSpec {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  subtitle?: string;
  data: Array<Record<string, string | number>>;
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#2A7D99', '#577590', '#E07A5F', '#9B5DE5', '#F8B400', '#1a3a5c'];

function getColors(spec: AIChartSpec): string[] {
  return spec.colors?.length ? spec.colors : DEFAULT_COLORS;
}

function BarChartView({ spec }: { spec: AIChartSpec }) {
  const xKey = spec.xKey || Object.keys(spec.data[0] || {})[0];
  const yKeys = spec.yKeys || (spec.yKey ? [spec.yKey] : Object.keys(spec.data[0] || {}).filter(k => k !== xKey));
  const colors = getColors(spec);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={spec.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {yKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ spec }: { spec: AIChartSpec }) {
  const xKey = spec.xKey || Object.keys(spec.data[0] || {})[0];
  const yKeys = spec.yKeys || (spec.yKey ? [spec.yKey] : Object.keys(spec.data[0] || {}).filter(k => k !== xKey));
  const colors = getColors(spec);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={spec.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {yKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ spec }: { spec: AIChartSpec }) {
  const nameKey = spec.xKey || Object.keys(spec.data[0] || {})[0];
  const valueKey = spec.yKey || Object.keys(spec.data[0] || {}).find(k => k !== nameKey) || '';
  const colors = getColors(spec);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={spec.data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={70}
          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent || 0) * 100)}%`}
          labelLine={false}
        >
          {spec.data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AIChart({ spec }: { spec: AIChartSpec }) {
  if (!spec.data || spec.data.length === 0) return null;

  return (
    <div
      className="my-2 p-3 bg-white border border-[#E8E4DF] rounded-2xl"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {spec.title && (
        <p className="text-sm font-semibold text-[#3A4A57] mb-0.5">{spec.title}</p>
      )}
      {spec.subtitle && (
        <p className="text-sm text-slate-400 mb-2">{spec.subtitle}</p>
      )}
      {spec.type === 'bar' && <BarChartView spec={spec} />}
      {spec.type === 'line' && <LineChartView spec={spec} />}
      {spec.type === 'pie' && <PieChartView spec={spec} />}
    </div>
  );
}

/**
 * Parse AI response text that may contain [CHART:{...}] tokens.
 * Returns an array of text and chart parts for inline rendering.
 */
export interface CalendarSpec {
  id?: string;
  title: string;
  provider?: string;
  service_type?: string;
  start_iso: string;
  end_iso?: string;
  location?: string;
  notes?: string;
}

/**
 * Find all [TAG:{...}] blocks (where TAG is CHART or CALENDAR) in a string.
 * Counts braces + respects strings so nested arrays/objects work.
 */
function findRichBlocks(text: string, tag: string): Array<{ start: number; end: number; json: string }> {
  const results: Array<{ start: number; end: number; json: string }> = [];
  const marker = `[${tag}:`;
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf(marker, i);
    if (start === -1) break;
    const jsonStart = start + marker.length;

    let depth = 0;
    let inString = false;
    let escape = false;
    let jsonEnd = -1;
    let closingBracket = -1;

    for (let j = jsonStart; j < text.length; j++) {
      const c = text[j];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') inString = !inString;
      if (inString) continue;

      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          jsonEnd = j + 1;
          let k = jsonEnd;
          while (k < text.length && (text[k] === ' ' || text[k] === '\n')) k++;
          if (text[k] === ']') closingBracket = k;
          break;
        }
      }
    }

    if (jsonEnd > 0 && closingBracket > 0) {
      results.push({ start, end: closingBracket + 1, json: text.slice(jsonStart, jsonEnd) });
      i = closingBracket + 1;
    } else {
      i = jsonStart;
    }
  }
  return results;
}

export type NavigateSpec = { screen: string; tab?: string; label?: string };

export type AIResponsePart =
  | { type: 'text'; content: string }
  | { type: 'chart'; content: AIChartSpec }
  | { type: 'calendar'; content: CalendarSpec }
  | { type: 'navigate'; content: NavigateSpec };

export function parseAIResponseParts(text: string): AIResponsePart[] {
  // Find chart + calendar + navigate blocks, sorted by position, then carve text between them.
  const chartBlocks = findRichBlocks(text, 'CHART').map(b => ({ ...b, kind: 'chart' as const }));
  const calendarBlocks = findRichBlocks(text, 'CALENDAR').map(b => ({ ...b, kind: 'calendar' as const }));
  const navigateBlocks = findRichBlocks(text, 'NAVIGATE').map(b => ({ ...b, kind: 'navigate' as const }));
  const blocks = [...chartBlocks, ...calendarBlocks, ...navigateBlocks].sort((a, b) => a.start - b.start);

  const parts: AIResponsePart[] = [];
  let cursor = 0;

  for (const block of blocks) {
    if (block.start > cursor) {
      const textPart = text.slice(cursor, block.start).trim();
      if (textPart) parts.push({ type: 'text', content: textPart });
    }
    try {
      if (block.kind === 'chart') {
        const spec = JSON.parse(block.json) as AIChartSpec;
        if (spec.data && Array.isArray(spec.data)) {
          parts.push({ type: 'chart', content: spec });
        }
      } else if (block.kind === 'navigate') {
        const spec = JSON.parse(block.json) as NavigateSpec;
        if (spec.screen) {
          parts.push({ type: 'navigate', content: spec });
        }
      } else {
        const spec = JSON.parse(block.json) as CalendarSpec;
        if (spec.title && spec.start_iso) {
          parts.push({ type: 'calendar', content: spec });
        }
      }
    } catch { /* skip malformed */ }
    cursor = block.end;
  }

  if (cursor < text.length) {
    const remaining = text.slice(cursor).trim();
    if (remaining) parts.push({ type: 'text', content: remaining });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
