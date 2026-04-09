// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MyPlanScreen — AI-powered "My Plan" care plan for parents
 *
 * Beautiful parent-facing care plan that synthesizes:
 * - Ease activity data
 * - Provider session notes
 * - Treatment goal progress
 * - Coverage alerts
 * - AI recommendations
 */
import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Clock,
  MessageSquare,
  Target,
  Heart,
  Star,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateDemoCarePlan, type AICarePlan } from '../../lib/ai-care-plan';

interface MyPlanScreenProps {
  onBack: () => void;
  childName?: string;
  onAskAminy?: () => void;
}

const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  speech: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: '🗣️' },
  social: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: '🤝' },
  sensory: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: '🌈' },
  executive: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', icon: '🧩' },
  routines: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', icon: '📋' },
  motor: { bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-200', icon: '✋' },
  emotional: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: '💛' },
  behavioral: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: '⭐' },
};

function getDomainStyle(domain: string) {
  return DOMAIN_COLORS[domain.toLowerCase()] || DOMAIN_COLORS.speech;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[priority]}`}>
      {priority}
    </span>
  );
}

export default function MyPlanScreen({ onBack, childName = 'Maya', onAskAminy }: MyPlanScreenProps) {
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const plan: AICarePlan = useMemo(() => generateDemoCarePlan(childName), [childName]);

  const toggleAction = (idx: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 px-4 pb-6 pt-12">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={handleRefresh}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
            >
              <RefreshCw className={`h-5 w-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-200" />
              <span className="text-sm font-medium text-teal-100">AI Care Plan</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white">{childName}'s Plan</h1>
            <p className="mt-1 text-sm text-teal-200">
              Updated {formatDate(plan.generatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 pb-32">
        {/* Weekly Focus Cards */}
        <section className="-mt-3">
          <div className="flex items-center justify-between px-1 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              This Week's Focus
            </h2>
            <Target className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {plan.weeklyFocus.map((focus, i) => {
                const style = getDomainStyle(focus.domain);
                return (
                  <motion.div
                    key={focus.domain}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`rounded-2xl border ${style.border} ${style.bg} p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-2xl">{style.icon}</div>
                      <div className="flex-1">
                        <h3 className={`text-sm font-bold ${style.text}`}>{focus.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                          {focus.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {focus.easeActivities.map((act) => (
                            <span
                              key={act}
                              className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow-sm"
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
                          <Heart className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700">
                            <span className="font-medium">Home task:</span> {focus.homeTask}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Provider Updates */}
        {plan.providerUpdates.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between px-1 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Provider Updates
              </h2>
              <MessageSquare className="h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-3">
              {plan.providerUpdates.map((update, i) => (
                <motion.div
                  key={`${update.date}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{update.provider}</p>
                      <p className="text-xs text-gray-500">{formatDate(update.date)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-gray-600">{update.summary}</p>
                  {update.wins.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {update.wins.map((win, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Star className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
                          <span className="text-xs text-gray-700">{win}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {update.focusAreas.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {update.focusAreas.map((area, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Target className="mt-0.5 h-3 w-3 flex-shrink-0 text-teal-500" />
                          <span className="text-xs text-gray-700">{area}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Goal Progress */}
        {plan.goalProgress.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between px-1 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Goal Progress
              </h2>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-3">
              {plan.goalProgress.map((goal, i) => (
                <motion.div
                  key={goal.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
                    <div className="flex items-center gap-1">
                      {goal.change > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : goal.change < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-400" />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          goal.change > 0
                            ? 'text-green-600'
                            : goal.change < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {goal.change > 0 ? '+' : ''}{goal.change}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{goal.currentPct}%</span>
                      <span>Target: 100%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.currentPct}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                        className={`h-full rounded-full ${
                          goal.change > 0
                            ? 'bg-gradient-to-r from-green-400 to-green-500'
                            : goal.change < 0
                              ? 'bg-gradient-to-r from-red-400 to-red-500'
                              : 'bg-gradient-to-r from-teal-400 to-teal-500'
                        }`}
                      />
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-gray-600">
                    {goal.recommendation}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Coverage Alerts */}
        {plan.coverageAlerts.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between px-1 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Coverage Alerts
              </h2>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="space-y-3">
              {plan.coverageAlerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                    <p className="text-xs leading-relaxed text-amber-800">{alert}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* AI Recommendations */}
        {plan.aiRecommendations.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between px-1 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                AI Recommendations
              </h2>
              <Sparkles className="h-4 w-4 text-teal-500" />
            </div>
            <div className="space-y-3">
              {plan.aiRecommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-500" />
                    <p className="text-xs leading-relaxed text-teal-800">{rec}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Next Actions Checklist */}
        <section className="mt-8">
          <div className="flex items-center justify-between px-1 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Next Actions
            </h2>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {plan.nextActions.map((action, i) => (
              <button
                key={i}
                onClick={() => toggleAction(i)}
                className={`flex w-full items-start gap-3 border-b border-gray-100 p-4 text-left last:border-b-0 transition-colors ${
                  checkedActions.has(i) ? 'bg-gray-50' : ''
                }`}
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    checkedActions.has(i)
                      ? 'border-teal-500 bg-teal-500'
                      : 'border-gray-300'
                  }`}
                >
                  {checkedActions.has(i) && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      checkedActions.has(i)
                        ? 'text-gray-400 line-through'
                        : 'text-gray-900'
                    }`}
                  >
                    {action.action}
                  </p>
                  {action.dueDate && (
                    <div className="mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-[10px] text-gray-500">
                        Due {formatDate(action.dueDate)}
                      </span>
                    </div>
                  )}
                </div>
                <PriorityBadge priority={action.priority} />
              </button>
            ))}
          </div>
        </section>

        {/* Ask Aminy CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-8"
        >
          <button
            onClick={onAskAminy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" />
            Ask Aminy about this plan
          </button>
          <p className="mt-2 text-center text-[11px] text-gray-400">
            Get personalized answers about your child's care plan
          </p>
        </motion.div>
      </div>
    </div>
  );
}
