// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * KPI Engine - Stub
 * Original file was removed. This provides no-op exports to prevent build errors.
 */

export type KPIStatus = 'on_track' | 'improving' | 'needs_attention' | 'declining' | 'stable';
export type KPITrend = 'up' | 'down' | 'flat';

export interface KPIValue {
  value: number;
  label: string;
  change: number;
  trend: KPITrend;
  status: KPIStatus;
  interpretation: string;
}

export interface KPISnapshot {
  kpis: {
    routineAdherence: KPIValue;
    overwhelmDelta: KPIValue;
    toughMoments: KPIValue;
    goalProgress: KPIValue;
  };
  calculatedAt: string;
}

interface KPIExplanation {
  title: string;
  description: string;
  howToImprove: string[];
  disclaimer: string;
}

const defaultKPIValue: KPIValue = {
  value: 0,
  label: '--',
  change: 0,
  trend: 'flat',
  status: 'stable',
  interpretation: 'No data yet',
};

export class KPIEngine {
  constructor(
    private _userId: string,
    private _childId: string
  ) {}

  async getOrCalculateKPIs(_timeframe: '7d' | '30d'): Promise<KPISnapshot> {
    console.warn('[KPIEngine] getOrCalculateKPIs is a no-op stub');
    return {
      kpis: {
        routineAdherence: { ...defaultKPIValue },
        overwhelmDelta: { ...defaultKPIValue },
        toughMoments: { ...defaultKPIValue },
        goalProgress: { ...defaultKPIValue },
      },
      calculatedAt: new Date().toISOString(),
    };
  }

  getKPIExplanation(_kpiName: string): KPIExplanation {
    return {
      title: 'KPI Information',
      description: 'This metric tracks your wellness progress.',
      howToImprove: ['Continue using the app daily', 'Complete your routines'],
      disclaimer: 'These metrics are for informational purposes only and do not constitute medical advice.',
    };
  }
}

export function getStatusColor(status: KPIStatus): string {
  switch (status) {
    case 'on_track': return 'bg-green-100 text-green-800 border-green-200';
    case 'improving': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'needs_attention': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'declining': return 'bg-red-100 text-red-800 border-red-200';
    case 'stable': return 'bg-slate-100 text-slate-800 border-slate-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getStatusIcon(status: KPIStatus): string {
  switch (status) {
    case 'on_track': return '\u2705';
    case 'improving': return '\uD83D\uDCC8';
    case 'needs_attention': return '\u26A0\uFE0F';
    case 'declining': return '\uD83D\uDCC9';
    case 'stable': return '\u2796';
    default: return '\u2796';
  }
}

export function getTrendIcon(trend: KPITrend): string {
  switch (trend) {
    case 'up': return '\u2191';
    case 'down': return '\u2193';
    case 'flat': return '\u2192';
    default: return '\u2192';
  }
}

export function getTrendColor(trend: KPITrend, inverted = false): string {
  if (inverted) {
    switch (trend) {
      case 'up': return 'text-red-600';
      case 'down': return 'text-green-600';
      case 'flat': return 'text-slate-500';
      default: return 'text-slate-500';
    }
  }
  switch (trend) {
    case 'up': return 'text-green-600';
    case 'down': return 'text-red-600';
    case 'flat': return 'text-slate-500';
    default: return 'text-slate-500';
  }
}
