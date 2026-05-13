// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Weekly Progress Digest
 *
 * Beautiful parent-facing weekly report showing:
 * - Child's Ease engagement summary
 * - Therapy session highlights (from provider notes)
 * - Goal progress with visual bars
 * - Home program completion rate
 * - Mood trends
 * - Next week's focus suggestions
 *
 * This is what makes parents tell other parents about Aminy.
 */

import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Star, TrendingUp, Heart, Brain, Wind, Music,
  CheckCircle, Calendar, ArrowRight, Share2,
  Sparkles, Target, Flame,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface WeeklyDigestProps {
  childName: string;
  weekOf: string; // "March 24 - 30, 2026"
  easeEngagement: {
    totalSessions: number;
    totalMinutes: number;
    activitiesByDomain: { domain: string; count: number; emoji: string }[];
    calmCornerSessions: number;
    avgRegulationTimeSecs: number;
    streakDays: number;
    starsEarned: number;
  };
  therapySessions: {
    date: string;
    provider: string;
    type: string;
    highlights: string[];
    goalsWorkedOn: string[];
  }[];
  goalProgress: {
    title: string;
    domain: string;
    currentPct: number;
    previousPct: number;
    status: 'improving' | 'steady' | 'needs-focus';
  }[];
  homeProgram: {
    tasksAssigned: number;
    tasksCompleted: number;
    completionRate: number;
  };
  moodTrend: {
    avgMood: number; // 1-5
    moodChange: 'improving' | 'steady' | 'declining';
    bestDay: string;
    toughestDay?: string;
  };
  nextWeekFocus: string[];
  parentTip: string;
  onShare?: () => void;
  onAskQuestion?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function ProgressBar({ value, color = 'teal' }: { value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    red: 'bg-red-400',
  };
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all ${colorMap[color] || colorMap.teal}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'improving' | 'steady' | 'needs-focus' | 'declining' }) {
  const config = {
    improving: { label: 'Improving', className: 'bg-green-50 text-green-700 border-green-200' },
    steady: { label: 'Steady', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    'needs-focus': { label: 'Needs Focus', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    declining: { label: 'Needs Support', className: 'bg-red-50 text-red-700 border-red-200' },
  };
  const c = config[trend];
  return <Badge variant="outline" className={`text-xs ${c.className}`}>{c.label}</Badge>;
}

function MoodEmoji({ value }: { value: number }) {
  if (value >= 4.5) return <span className="text-2xl">😄</span>;
  if (value >= 3.5) return <span className="text-2xl">🙂</span>;
  if (value >= 2.5) return <span className="text-2xl">😐</span>;
  if (value >= 1.5) return <span className="text-2xl">😟</span>;
  return <span className="text-2xl">😢</span>;
}

// ============================================================================
// Component
// ============================================================================

export function WeeklyProgressDigest({
  childName,
  weekOf,
  easeEngagement,
  therapySessions,
  goalProgress,
  homeProgram,
  moodTrend,
  nextWeekFocus,
  parentTip,
  onShare,
  onAskQuestion,
}: WeeklyDigestProps) {
  const improvingGoals = goalProgress.filter(g => g.status === 'improving').length;
  const totalGoals = goalProgress.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white px-5 pt-8 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-1">
          <Sparkles size={20} className="text-teal-200" />
          {onShare && (
            <button onClick={onShare} className="flex items-center gap-1 text-teal-200 text-xs">
              <Share2 size={14} /> Share
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-1">{childName}'s Week</h1>
        <p className="text-teal-200 text-sm">{weekOf}</p>

        {/* Quick Stats Row */}
        <div className="flex gap-3 mt-5">
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{easeEngagement.totalSessions}</div>
            <div className="text-xs text-teal-200">Activities</div>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{easeEngagement.totalMinutes}</div>
            <div className="text-xs text-teal-200">Minutes</div>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              {easeEngagement.streakDays}<Flame size={16} className="text-amber-400" />
            </div>
            <div className="text-xs text-teal-200">Day Streak</div>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              {easeEngagement.starsEarned}<Star size={16} className="text-amber-400" />
            </div>
            <div className="text-xs text-teal-200">Stars</div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Celebration Card */}
        {improvingGoals > 0 && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎉</span>
              <span className="font-bold text-green-800">Great Progress!</span>
            </div>
            <p className="text-green-700 text-sm">
              {childName} is improving on {improvingGoals} out of {totalGoals} goals this week.
              {easeEngagement.calmCornerSessions > 0 && ` Used Calm Corner ${easeEngagement.calmCornerSessions} times with an average calm-down time of ${easeEngagement.avgRegulationTimeSecs} seconds.`}
            </p>
          </Card>
        )}

        {/* Ease Activity Breakdown */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Brain size={16} className="text-teal-600" /> Ease Activities
          </h3>
          <div className="space-y-2.5">
            {easeEngagement.activitiesByDomain.map(d => (
              <div key={d.domain} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{d.emoji}</span>
                  <span className="text-sm text-gray-700 capitalize">{d.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20">
                    <ProgressBar value={(d.count / Math.max(...easeEngagement.activitiesByDomain.map(x => x.count), 1)) * 100} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-6 text-right">{d.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Therapy Sessions */}
        {therapySessions.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" /> Therapy This Week
            </h3>
            {therapySessions.map((session, i) => (
              <div key={i} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-0 border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{session.type}</span>
                  <span className="text-xs text-gray-500">{session.date}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1.5">with {session.provider}</p>
                {session.highlights.map((h, j) => (
                  <div key={j} className="flex items-start gap-1.5 mb-1">
                    <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{h}</span>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        )}

        {/* Goal Progress */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Target size={16} className="text-purple-600" /> Goal Progress
          </h3>
          {goalProgress.map((goal, i) => (
            <div key={i} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-900">{goal.title}</span>
                <TrendBadge trend={goal.status} />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar
                    value={goal.currentPct}
                    color={goal.status === 'improving' ? 'green' : goal.status === 'steady' ? 'blue' : 'amber'}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-10 text-right">{goal.currentPct}%</span>
              </div>
              {goal.currentPct > goal.previousPct && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-green-500" />
                  <span className="text-xs text-green-600">+{goal.currentPct - goal.previousPct}% from last week</span>
                </div>
              )}
            </div>
          ))}
        </Card>

        {/* Home Program */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Heart size={16} className="text-rose-500" /> Home Program
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {homeProgram.tasksCompleted}/{homeProgram.tasksAssigned} tasks completed
            </span>
            <span className="text-lg font-bold text-gray-900">{homeProgram.completionRate}%</span>
          </div>
          <ProgressBar value={homeProgram.completionRate} color={homeProgram.completionRate >= 70 ? 'green' : homeProgram.completionRate >= 40 ? 'amber' : 'red'} />
        </Card>

        {/* Mood Trend */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Wind size={16} className="text-teal-600" /> Mood This Week
          </h3>
          <div className="flex items-center gap-3">
            <MoodEmoji value={moodTrend.avgMood} />
            <div>
              <div className="text-sm font-medium text-gray-900">
                Average: {moodTrend.avgMood.toFixed(1)}/5
              </div>
              <div className="text-xs text-gray-500">
                Best day: {moodTrend.bestDay}
                {moodTrend.toughestDay && ` · Toughest: ${moodTrend.toughestDay}`}
              </div>
            </div>
            <TrendBadge trend={moodTrend.moodChange === 'improving' ? 'improving' : moodTrend.moodChange === 'steady' ? 'steady' : 'needs-focus'} />
          </div>
        </Card>

        {/* Next Week Focus */}
        <Card className="p-4 bg-teal-50 border-teal-200">
          <h3 className="font-semibold text-teal-800 mb-2">Next Week's Focus</h3>
          {nextWeekFocus.map((focus, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <ArrowRight size={14} className="text-teal-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-teal-700">{focus}</span>
            </div>
          ))}
        </Card>

        {/* Parent Tip */}
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-purple-500" />
            <span className="text-xs font-medium text-purple-600 uppercase">Tip for You</span>
          </div>
          <p className="text-sm text-purple-800">{parentTip}</p>
        </Card>

        {/* CTA */}
        {onAskQuestion && (
          <button
            onClick={onAskQuestion}
            className="w-full bg-teal-600 text-white rounded-xl py-3 px-4 font-medium text-sm flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            Questions? Aminy AI
          </button>
        )}
      </div>
    </div>
  );
}
