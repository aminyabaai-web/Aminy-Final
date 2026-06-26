// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * WellnessScoreWidget — Bevel-style "Biological Age" card for child development.
 *
 * Presents the composite Developmental Wellness Score with trend, confidence,
 * top domains and a single actionable insight. Designed to slot into the
 * dashboard hero area as a single tappable card.
 */

import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Sparkles } from 'lucide-react';
import type { WellnessScore } from '../lib/developmental-wellness-score';

interface WellnessScoreWidgetProps {
  score: WellnessScore;
  childName?: string;
  onViewDetails?: () => void;
  className?: string;
}

export function WellnessScoreWidget({
  score,
  childName,
  onViewDetails,
  className = '',
}: WellnessScoreWidgetProps) {
  const topDomains = [...score.domains]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const topInsight = score.celebration || score.insights[0];
  const compositeColor = colorForScore(score.composite);

  return (
    <motion.button
      type="button"
      onClick={onViewDetails}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`w-full text-left rounded-3xl bg-white border border-[#F0EDE8] shadow-[0_18px_40px_rgba(15,23,42,0.06)] p-5 sm:p-6 active:scale-[0.99] transition-transform ${className}`}
      aria-label={`Wellness score ${score.composite} of 100, ${score.confidenceLabel}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8E9BAA] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#6B9080]" />
            Wellness Score
          </div>
          <p className="mt-1 text-sm text-[#8E9BAA]">
            {childName ? `${childName}'s weekly progress` : 'Your child\'s weekly progress'}
          </p>
        </div>
        {onViewDetails && (
          <ChevronRight className="w-5 h-5 text-[#8E9BAA] flex-shrink-0" />
        )}
      </div>

      {/* Composite + trend */}
      <div className="flex items-end gap-3 mb-4">
        <div className="flex items-baseline gap-1">
          <span
            className="text-5xl font-semibold tracking-tight"
            style={{ color: compositeColor }}
          >
            {score.composite}
          </span>
          <span className="text-base text-[#8E9BAA] font-medium">/100</span>
        </div>
        <TrendBadge trend={score.trend} direction={score.trendDirection} />
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-[#8E9BAA]">{score.confidenceLabel}</span>
          <span className="text-sm font-medium text-[#5A6B7A]">{score.confidence}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#F0EDE8] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score.confidence}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #2A7D99 0%, #4795AE 100%)' }}
          />
        </div>
      </div>

      {/* Domain chips */}
      {topDomains.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topDomains.map((d) => (
            <div
              key={d.domain}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: `${d.color}15`,
                color: d.color,
              }}
            >
              <span aria-hidden="true">{d.icon}</span>
              <span>{d.domain}</span>
              <span className="opacity-70">{d.score}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top insight */}
      {topInsight && (
        <div className="rounded-2xl bg-[#FAF7F2] border border-[#F0EDE8] px-3.5 py-2.5">
          <p className="text-sm text-[#132F43] leading-snug">{topInsight}</p>
        </div>
      )}

      {/* Footer */}
      <p className="mt-3 text-sm text-[#8E9BAA]">
        Updates in {score.nextUpdate}
      </p>
    </motion.button>
  );
}

function TrendBadge({
  trend,
  direction,
}: {
  trend: number;
  direction: 'up' | 'down' | 'stable';
}) {
  if (direction === 'stable' || trend === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0EDE8] text-[#5A6B7A] text-xs font-medium">
        <Minus className="w-3 h-3" />
        Steady
      </span>
    );
  }
  const isUp = direction === 'up';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: isUp ? '#2A7D9915' : '#E07A5F15',
        color: isUp ? '#2A7D99' : '#E07A5F',
      }}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}
      {trend} this week
    </span>
  );
}

function colorForScore(score: number): string {
  if (score >= 75) return '#2A7D99';
  if (score >= 50) return '#2A7D99';
  if (score >= 30) return '#D4A373';
  return '#E07A5F';
}

export default WellnessScoreWidget;
