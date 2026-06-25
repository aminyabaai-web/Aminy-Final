// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * KPI Tiles Component
 * 
 * Displays the 4 payer-grade KPIs in a beautiful, calm design.
 * Shows on:
 * - Parent Dashboard
 * - Provider Portal (child detail)
 * - Weekly Reports
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { KPIEngine, type KPISnapshot, type KPIValue, getStatusColor, getStatusIcon, getTrendIcon, getTrendColor } from '../lib/kpi-engine';
import { ANIMATIONS, HAPTICS } from '../lib/mobile-experience-enhancer';

interface KPITilesProps {
  userId: string;
  childId: string;
  timeframe?: '7d' | '30d';
  variant?: 'dashboard' | 'provider' | 'compact';
}

export function KPITiles({ userId, childId, timeframe = '7d', variant = 'dashboard' }: KPITilesProps) {
  const [kpis, setKpis] = useState<KPISnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState<'routineAdherence' | 'overwhelmDelta' | 'toughMoments' | 'goalProgress' | null>(null);

  const kpiEngine = new KPIEngine(userId, childId);

  useEffect(() => {
    loadKPIs();
  }, [timeframe]);

  const loadKPIs = async () => {
    setLoading(true);
    try {
      const snapshot = await kpiEngine.getOrCalculateKPIs(timeframe);
      setKpis(snapshot);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`grid ${variant === 'compact' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'} gap-3`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-[#E8E4DF] rounded w-3/4 mb-3"></div>
            <div className="h-8 bg-[#E8E4DF] rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-[#E8E4DF] rounded w-full"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-[#5A6B7A]">No data available yet. Start tracking to see your progress!</p>
      </Card>
    );
  }

  const kpiData = [
    {
      id: 'routineAdherence',
      name: 'Routine Adherence',
      icon: '✅',
      kpi: kpis.kpis.routineAdherence
    },
    {
      id: 'overwhelmDelta',
      name: 'Your Stress',
      icon: '💙',
      kpi: kpis.kpis.overwhelmDelta
    },
    {
      id: 'toughMoments',
      name: 'Tough Moments',
      icon: '🤝',
      kpi: kpis.kpis.toughMoments,
      inverted: true // Lower is better
    },
    {
      id: 'goalProgress',
      name: 'Goal Progress',
      icon: '🎯',
      kpi: kpis.kpis.goalProgress
    }
  ];

  return (
    <>
      <div className={`grid ${variant === 'compact' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'} gap-3`}>
        {kpiData.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <KPITile
              name={item.name}
              icon={item.icon}
              kpi={item.kpi}
              inverted={item.inverted}
              onInfoClick={() => {
                HAPTICS.light();
                setSelectedKPI(item.id as 'routineAdherence' | 'overwhelmDelta' | 'toughMoments' | 'goalProgress');
              }}
              variant={variant}
            />
          </motion.div>
        ))}
      </div>

      {/* Info Modal */}
      {selectedKPI && (
        <KPIExplainerModal
          kpiName={selectedKPI!}
          isOpen={!!selectedKPI}
          onClose={() => setSelectedKPI(null)}
          kpiEngine={kpiEngine}
        />
      )}
    </>
  );
}

// ===================================
// INDIVIDUAL KPI TILE
// ===================================

function KPITile({
  name,
  icon,
  kpi,
  inverted = false,
  onInfoClick,
  variant = 'dashboard'
}: {
  name: string;
  icon: string;
  kpi: KPIValue;
  inverted?: boolean;
  onInfoClick: () => void;
  variant?: 'dashboard' | 'provider' | 'compact';
}) {
  const compact = variant === 'compact';

  return (
    <Card className={`relative overflow-hidden bg-white border border-[#E8E4DF]/60 shadow-sm ${compact ? 'p-3' : 'p-4'} hover:shadow-md transition-all duration-300 rounded-2xl`}>
      {/* Subtle background tint matching status at the top edge */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(kpi.status)} opacity-50`} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center ${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full ${getStatusColor(kpi.status)} bg-opacity-20`}>
            <span className={compact ? 'text-sm' : 'text-sm'}>{icon}</span>
          </div>
          <h3 className={`${compact ? 'text-sm' : 'text-sm'} font-medium text-[#5A6B7A] tracking-tight`}>{name}</h3>
        </div>
        <button
          onClick={onInfoClick}
          className="text-[#8A9BA8] hover:text-[#5A6B7A] transition-colors"
        >
          <Info className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
      </div>

      <div className="mb-2">
        <div className="flex items-baseline gap-2">
          <span className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-[#1B2733] tracking-tight`}>
            {kpi.label}
          </span>
          {kpi.change !== 0 && (
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${getTrendColor(kpi.trend, inverted)} flex items-center gap-0.5 bg-[#FAF7F2] px-1.5 py-0.5 rounded-full`}>
              {getTrendIcon(kpi.trend)}
              {Math.abs(kpi.change) > 0 && `${Math.abs(kpi.change).toFixed(kpi.change % 1 === 0 ? 0 : 1)}`}
            </span>
          )}
        </div>
      </div>

      <p className={`${compact ? 'text-sm' : 'text-sm'} text-[#5A6B7A] font-medium`}>
        {kpi.interpretation}
      </p>

      {!compact && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-sm">{getStatusIcon(kpi.status)}</span>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{kpi.status.replace('_', ' ')}</span>
        </div>
      )}
    </Card>
  );
}

// ===================================
// KPI EXPLAINER MODAL
// ===================================

function KPIExplainerModal({
  kpiName,
  isOpen,
  onClose,
  kpiEngine
}: {
  kpiName: 'routineAdherence' | 'overwhelmDelta' | 'toughMoments' | 'goalProgress';
  isOpen: boolean;
  onClose: () => void;
  kpiEngine: KPIEngine;
}) {
  const explanation = kpiEngine.getKPIExplanation(kpiName);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{explanation.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-[#1B2733] mb-2">What this measures:</h4>
            <p className="text-sm text-[#3A4A57]">{explanation.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[#1B2733] mb-2">How to improve:</h4>
            <ul className="space-y-1">
              {explanation.howToImprove.map((tip: string, idx: number) => (
                <li key={idx} className="text-sm text-[#3A4A57] flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Important:</strong> {explanation.disclaimer}
            </p>
          </div>

          <Button onClick={onClose} className="w-full bg-accent text-white">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===================================
// KPI SUMMARY FOR REPORTS
// ===================================

export function KPISummaryForReport({ userId, childId, timeframe = '30d' }: {
  userId: string;
  childId: string;
  timeframe?: '7d' | '30d';
}) {
  const [kpis, setKpis] = useState<KPISnapshot | null>(null);

  useEffect(() => {
    const kpiEngine = new KPIEngine(userId, childId);
    kpiEngine.getOrCalculateKPIs(timeframe).then(setKpis);
  }, [timeframe]);

  if (!kpis) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[#1B2733] mb-3">Key Progress Indicators ({timeframe})</h3>

      <div className="grid grid-cols-2 gap-3">
        <SummaryMetric
          label="Routine Adherence"
          value={kpis.kpis.routineAdherence.label}
          status={kpis.kpis.routineAdherence.status}
        />
        <SummaryMetric
          label="Stress Change"
          value={kpis.kpis.overwhelmDelta.label}
          status={kpis.kpis.overwhelmDelta.status}
        />
        <SummaryMetric
          label="Tough Moments"
          value={kpis.kpis.toughMoments.label}
          status={kpis.kpis.toughMoments.status}
        />
        <SummaryMetric
          label="Goal Progress"
          value={kpis.kpis.goalProgress.label}
          status={kpis.kpis.goalProgress.status}
        />
      </div>

      <div className="text-sm text-[#5A6B7A] mt-3 p-2 bg-[#FAF7F2] rounded">
        <strong>Disclaimer:</strong> These metrics track wellness support and coaching progress, not medical treatment outcomes. Parents remain the decision authority for all care decisions.
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, status }: {
  label: string;
  value: string;
  status: KPIValue['status'];
}) {
  return (
    <div className={`${getStatusColor(status)} border rounded-lg p-2`}>
      <div className="text-sm opacity-80 mb-1">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-sm opacity-70 mt-1 capitalize">{status.replace('_', ' ')}</div>
    </div>
  );
}

// ===================================
// KPI TREND CHART (Simple)
// ===================================

export function KPITrendChart({ userId, childId, kpiName, days = 30 }: {
  userId: string;
  childId: string;
  kpiName: 'routineAdherence' | 'overwhelmDelta' | 'toughMoments' | 'goalProgress';
  days?: number;
}) {
  const [data, setData] = useState<Array<{ date: string; value: number }>>([]);

  useEffect(() => {
    // Would fetch historical data
    // For now, mock trend
    const mockData = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.random() * 100
    }));
    setData(mockData);
  }, [days]);

  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-2">
      <h4 className="text-sm text-[#3A4A57] capitalize">{kpiName.replace(/([A-Z])/g, ' $1')} Trend</h4>
      <div className="h-32 flex items-end gap-1">
        {data.map((point, idx) => (
          <div
            key={idx}
            className="flex-1 bg-accent rounded-t transition-all hover:opacity-80"
            style={{ height: `${(point.value / max) * 100}%` }}
            title={`${point.date}: ${point.value.toFixed(1)}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-sm text-[#5A6B7A]">
        <span>{days} days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
