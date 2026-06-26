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
  speech: { bg: 'bg-[#EEF4F8]', text: 'text-[#4A6478]', border: 'border-[#C8DDE8]', icon: '🗣️' },
  social: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: '🤝' },
  sensory: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: '🌈' },
  executive: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-[#6B9080]/20', icon: '🧩' },
  routines: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', icon: '📋' },
  motor: { bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-200', icon: '✋' },
  emotional: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: '💛' },
  behavioral: { bg: 'bg-[#FDF9F0]', text: 'text-[#3A4A57]', border: 'border-[#EDF4F7]', icon: '⭐' },
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
    low: 'bg-[#EDF4F7] text-[#5A6B7A]',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${styles[priority]}`}>
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
    <div className="min-h-screen bg-mist">
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5A6B7A]">
              This Week's Focus
            </h2>
            <Target className="h-4 w-4 text-[#8A9BA8]" />
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
                        <p className="mt-1 text-sm leading-relaxed text-[#5A6B7A]">
                          {focus.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {focus.easeActivities.map((act) => (
                            <span
                              key={act}
                              className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-[#3A4A57] shadow-sm"
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
                          <Heart className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
                          <span className="text-sm text-[#3A4A57]">
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5A6B7A]">
                Provider Updates
              </h2>
              <MessageSquare className="h-4 w-4 text-[#8A9BA8]" />
            </div>
            <div className="space-y-3">
              {plan.providerUpdates.map((update, i) => (
                <motion.div
                  key={`${update.date}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="rounded-2xl border border-[#E8E4DF] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#132F43]">{update.provider}</p>
                      <p className="text-sm text-[#5A6B7A]">{formatDate(update.date)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#8A9BA8]" />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#5A6B7A]">{update.summary}</p>
                  {update.wins.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {update.wins.map((win, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Star className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
                          <span className="text-sm text-[#3A4A57]">{win}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {update.focusAreas.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {update.focusAreas.map((area, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Target className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary" />
                          <span className="text-sm text-[#3A4A57]">{area}</span>
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5A6B7A]">
                Goal Progress
              </h2>
              <TrendingUp className="h-4 w-4 text-[#8A9BA8]" />
            </div>
            <div className="space-y-3">
              {plan.goalProgress.map((goal, i) => (
                <motion.div
                  key={goal.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="rounded-2xl border border-[#E8E4DF] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#132F43]">{goal.title}</p>
                    <div className="flex items-center gap-1">
                      {goal.change > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : goal.change < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-[#8A9BA8]" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          goal.change > 0
                            ? 'text-green-600'
                            : goal.change < 0
                              ? 'text-red-600'
                              : 'text-[#5A6B7A]'
                        }`}
                      >
                        {goal.change > 0 ? '+' : ''}{goal.change}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-[#5A6B7A]">
                      <span>{goal.currentPct}%</span>
                      <span>Target: 100%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#EDF4F7]">
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
                  <p className="mt-2.5 text-sm leading-relaxed text-[#5A6B7A]">
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5A6B7A]">
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
                    <p className="text-sm leading-relaxed text-amber-800">{alert}</p>
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5A6B7A]">
                AI Recommendations
              </h2>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-3">
              {plan.aiRecommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="rounded-2xl border border-[#6B9080]/20 bg-gradient-to-br from-[#F6FBFB] to-cyan-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <p className="text-sm leading-relaxed text-[#6B9080]">{rec}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Next Actions Checklist */}
        <section className="mt-8">
          <div className="flex items-center justify-between px-1 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5A6B7A]">
              Next Actions
            </h2>
            <CheckCircle className="h-4 w-4 text-[#8A9BA8]" />
          </div>
          <div className="rounded-2xl border border-[#E8E4DF] bg-white shadow-sm">
            {plan.nextActions.map((action, i) => (
              <button
                key={i}
                onClick={() => toggleAction(i)}
                className={`flex w-full items-start gap-3 border-b border-[#E8E4DF] p-4 text-left last:border-b-0 transition-colors ${
                  checkedActions.has(i) ? 'bg-[#F6FBFB]' : ''
                }`}
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    checkedActions.has(i)
                      ? 'border-[#6B9080] bg-primary'
                      : 'border-[#E8E4DF]'
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
                        ? 'text-[#8A9BA8] line-through'
                        : 'text-[#132F43]'
                    }`}
                  >
                    {action.action}
                  </p>
                  {action.dueDate && (
                    <div className="mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#8A9BA8]" />
                      <span className="text-sm text-[#5A6B7A]">
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] px-6 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" />
            Ask Aminy AI about this plan
          </button>
          <p className="mt-2 text-center text-sm text-[#8A9BA8]">
            Get personalized answers about your child's care plan
          </p>
        </motion.div>
      </div>
    </div>
  );
}
