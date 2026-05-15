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

const DEFAULT_COLORS = ['#43AA8B', '#577590', '#E07A5F', '#9B5DE5', '#F8B400', '#1a3a5c'];

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
          label={({ name, percent }: { name: string; percent: number }) => `${name} ${Math.round((percent || 0) * 100)}%`}
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
      className="my-2 p-3 bg-white border border-slate-100 rounded-2xl"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {spec.title && (
        <p className="text-xs font-semibold text-slate-700 mb-0.5">{spec.title}</p>
      )}
      {spec.subtitle && (
        <p className="text-xs text-slate-400 mb-2">{spec.subtitle}</p>
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
export function parseAIResponseParts(text: string): Array<
  { type: 'text'; content: string } | { type: 'chart'; content: AIChartSpec }
> {
  const parts: Array<{ type: 'text'; content: string } | { type: 'chart'; content: AIChartSpec }> = [];
  const regex = /\[CHART:(\{.*?\})\]/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textPart = text.slice(lastIndex, match.index).trim();
      if (textPart) parts.push({ type: 'text', content: textPart });
    }
    try {
      const spec = JSON.parse(match[1]) as AIChartSpec;
      if (spec.data && Array.isArray(spec.data)) {
        parts.push({ type: 'chart', content: spec });
      }
    } catch {
      // Malformed JSON — skip the chart token
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) parts.push({ type: 'text', content: remaining });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
