// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * TreatmentPlanSummary — Parent-friendly treatment plan view
 * Screen: 'treatment-plan-summary'
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Share2,
  Calendar,
  User,
  Home,
  TrendingUp,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ParentFriendlyGoal,
  TreatmentPlanSummaryData,
  DOMAIN_LABEL,
  DEMO_CLINICAL_GOALS,
  generateParentSummary,
} from '../../lib/treatment-plan-translator';
import { isDemoMode } from '../../lib/demo-seed';
import { FileText } from 'lucide-react';

interface TreatmentPlanSummaryProps {
  onBack?: () => void;
  childName?: string;
}

// Domain colors
const DOMAIN_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'communication': { bg: 'bg-teal-50', text: 'text-teal-700', ring: 'ring-teal-200' },
  'social-skills': { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
  'daily-living': { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
  'behavior-reduction': { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' },
  'academic': { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  'motor': { bg: 'bg-pink-50', text: 'text-pink-700', ring: 'ring-pink-200' },
  'sensory': { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-200' },
  'executive-function': { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200' },
};

function ProgressRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={6}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: '#0f766e',
        }}
      >
        {percent}%
      </div>
    </div>
  );
}

// Simple CSS-only mini bar chart for progress over time
function ProgressMiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '36px' }}>
      {data.map((val, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(val / max) * 100}%`,
            minHeight: '3px',
            backgroundColor: i === data.length - 1 ? '#14b8a6' : '#d1fae5',
            borderRadius: '2px 2px 0 0',
            transition: 'height 0.5s ease',
          }}
          title={`${val}%`}
        />
      ))}
    </div>
  );
}

function GoalCard({ goal }: { goal: ParentFriendlyGoal }) {
  const [expanded, setExpanded] = useState(false);
  const colors = DOMAIN_COLORS[goal.domain] || DOMAIN_COLORS['communication'];
  // Fake sparkline data (would come from real historical data)
  const sparkline = [10, 18, 25, 30, goal.currentProgressPercent - 10, goal.currentProgressPercent];

  return (
    <Card className="overflow-hidden border border-slate-200 bg-white">
      {/* Card header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <ProgressRing percent={goal.currentProgressPercent} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-sm leading-snug">{goal.plainEnglishTitle}</h3>
              {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs px-2 py-0 ${colors.bg} ${colors.text} border-0`}>
                {DOMAIN_LABEL[goal.domain]}
              </Badge>
              <span className="text-xs text-slate-400">{goal.progressDescription}</span>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">

              {/* What it looks like */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">What this looks like</p>
                <p className="text-sm text-slate-600 leading-relaxed">{goal.whatItLooksLike}</p>
              </div>

              {/* Why it matters */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Why it matters</p>
                <p className="text-sm text-slate-600 leading-relaxed">{goal.whyItMatters}</p>
              </div>

              {/* Progress chart */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Progress over time</p>
                <ProgressMiniChart data={sparkline} />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">8 weeks ago</span>
                  <span className="text-xs text-teal-600 font-medium">Today: {goal.currentProgressPercent}%</span>
                </div>
              </div>

              {/* How to help at home */}
              <div className="bg-teal-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Home className="w-3.5 h-3.5 text-teal-600" />
                  <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">How to help at home</p>
                </div>
                <ul className="space-y-1.5">
                  {goal.howToHelpAtHome.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-teal-800">
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-1.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Measurement */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">How we measure it</p>
                <p className="text-sm text-slate-600 leading-relaxed">{goal.howWeMeasureIt}</p>
              </div>

              {/* Provider */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <User className="w-3.5 h-3.5" />
                <span>{goal.responsibleProvider}</span>
                <span>·</span>
                <Clock className="w-3.5 h-3.5" />
                <span>Updated {new Date(goal.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function TreatmentPlanSummary({ onBack, childName = 'Your Child' }: TreatmentPlanSummaryProps) {
  // The rich clinical plan (goals, provider notes, named clinicians) is sample
  // data shown ONLY in demo mode (investor / AACT walk-throughs). A real parent
  // must never see an invented treatment plan or provider name. Until this screen
  // is wired to a real plan source, real users get a friendly empty state.
  const plan: TreatmentPlanSummaryData | null = isDemoMode()
    ? generateParentSummary(
        DEMO_CLINICAL_GOALS,
        'monthly',
        childName,
        'Great month of progress! Tommy is showing real momentum on communication goals — he\'s been spontaneously requesting more often during sessions. Keep practicing at home with the "pause and wait" strategy. We\'re adjusting the social skills goal to include more peer interactions.',
        '2026-04-08',
        [
          {
            date: '2026-04-01',
            provider: 'Dr. Sarah Chen',
            note: 'Updated communication goal — increasing target from 3 to 5 mands per session based on recent progress.',
          },
          {
            date: '2026-03-28',
            provider: 'Katie Wilson',
            note: 'Added peer play component to social skills goal following IEP meeting.',
          },
        ]
      )
    : null;

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <div>
              <h1 className="text-base font-semibold text-slate-900">{childName}&apos;s Plan</h1>
              <p className="text-xs text-slate-400">Treatment plan summary</p>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-slate-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-700 mb-1">No treatment plan yet</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
            When your provider publishes a plan, you&apos;ll see {childName}&apos;s goals and progress here in plain English.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <div>
              <h1 className="text-base font-semibold text-slate-900">{childName}&apos;s Plan</h1>
              <p className="text-xs text-slate-400">{plan.periodLabel}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-slate-200"
            onClick={() => toast.success('Generating PDF for school sharing...')}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share with school
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 pb-16 space-y-5">

        {/* Overall progress card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-5 bg-gradient-to-br from-teal-600 to-cyan-600 border-0 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-teal-100 text-xs font-medium uppercase tracking-wider mb-0.5">Overall Progress</p>
                <p className="text-3xl font-bold">{plan.overallProgressPercent}%</p>
                <p className="text-teal-100 text-sm mt-0.5">across {plan.goals.length} active goals</p>
              </div>
              <div className="relative">
                <TrendingUp className="w-16 h-16 text-teal-400/40" />
              </div>
            </div>

            {/* Provider note */}
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-xs text-teal-100 font-medium mb-1">From your provider</p>
              <p className="text-sm text-white leading-relaxed">{plan.providerNote}</p>
            </div>
          </Card>
        </motion.div>

        {/* Next session */}
        {plan.nextSessionDate && (
          <Card className="p-3 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4.5 h-4.5 text-teal-600" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Next session</p>
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(plan.nextSessionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Goals section */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-teal-500" />
            Active Goals ({plan.goals.length})
          </h2>
          <div className="space-y-3">
            {plan.goals.map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              >
                <GoalCard goal={goal} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Provider update log */}
        {plan.recentUpdates.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Updates</h2>
            <div className="space-y-2">
              {plan.recentUpdates.map((update, i) => (
                <Card key={i} className="p-3 bg-white border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">
                        {update.provider} · {new Date(update.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">{update.note}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Share button */}
        <div className="pt-2">
          <Button
            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => toast.success('Generating PDF summary for school or pediatrician...')}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share with school or pediatrician
          </Button>
          <p className="text-xs text-center text-slate-400 mt-2">Creates a PDF-ready summary — no clinical jargon</p>
        </div>

      </div>
    </div>
  );
}
