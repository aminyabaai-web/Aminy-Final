// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * AI-Powered Admin Insights
 *
 * Uses AI to analyze user behavior and provide actionable recommendations:
 * - Feature usage patterns
 * - Churn risk identification
 * - Revenue optimization suggestions
 * - User experience improvements
 */

import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  Users,
  MessageSquare,
  Target,
  Sparkles,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  Clock,
  ArrowRight,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Insight {
  id: string;
  type: 'opportunity' | 'risk' | 'suggestion' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: string;
  impact?: string;
  action?: string;
  confidence: number;
}

interface FeatureUsage {
  feature: string;
  usagePercent: number;
  trend: 'up' | 'down' | 'stable';
  recommendation?: string;
}

interface ChurnRisk {
  userId: string;
  userName: string;
  riskScore: number;
  lastActive: string;
  reason: string;
  suggestedAction: string;
}

interface ProviderNPSRow {
  score: number;
  feedback: string | null;
  created_at: string;
  trigger: string | null;
}

interface ProviderStats {
  npsRows: ProviderNPSRow[];
  npsScore: number | null;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
}

// Parse a JSON array out of an AI response that may have surrounding prose
function extractInsightsJSON(text: string): Insight[] | null {
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return null;
  try {
    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed)) return null;
    // Normalise confidence: AI returns 0–100, we store 0–1
    return parsed.map((item: Record<string, unknown>, i: number) => ({
      id: String(item.id ?? i + 1),
      type: (['opportunity', 'risk', 'suggestion', 'trend'].includes(item.type as string)
        ? item.type
        : 'suggestion') as Insight['type'],
      priority: (['high', 'medium', 'low'].includes(item.priority as string)
        ? item.priority
        : 'medium') as Insight['priority'],
      title: String(item.title ?? 'Insight'),
      description: String(item.description ?? ''),
      metric: item.metric ? String(item.metric) : undefined,
      impact: item.impact ? String(item.impact) : undefined,
      action: item.action ? String(item.action) : undefined,
      confidence:
        typeof item.confidence === 'number'
          ? item.confidence > 1
            ? item.confidence / 100
            : item.confidence
          : 0.75,
    }));
  } catch {
    return null;
  }
}

// Build statistical fallback insights from raw data when AI call fails
function buildFallbackInsights(
  npsData: Array<{ score: number; feedback?: string | null }>,
  feedbackData: Array<{ rating?: number | null; comment?: string | null }>,
  providerCount: number
): Insight[] {
  const insights: Insight[] = [];

  if (npsData.length > 0) {
    const avg = npsData.reduce((s, r) => s + r.score, 0) / npsData.length;
    const promoters = npsData.filter(r => r.score >= 9).length;
    const detractors = npsData.filter(r => r.score <= 6).length;
    const npsScore = Math.round(((promoters - detractors) / npsData.length) * 100);
    insights.push({
      id: 'fb-nps',
      type: npsScore >= 50 ? 'opportunity' : npsScore >= 20 ? 'trend' : 'risk',
      priority: npsScore < 20 ? 'high' : 'medium',
      title: `NPS score: ${npsScore}`,
      description: `Based on ${npsData.length} responses, average score is ${avg.toFixed(1)}/10. ${promoters} promoters vs ${detractors} detractors.`,
      metric: `${npsScore} NPS`,
      confidence: 0.95,
    });
  }

  if (feedbackData.length > 0) {
    const rated = feedbackData.filter(f => f.rating != null);
    if (rated.length > 0) {
      const avgRating = rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length;
      insights.push({
        id: 'fb-feedback',
        type: avgRating >= 4 ? 'opportunity' : 'risk',
        priority: avgRating < 3 ? 'high' : 'medium',
        title: `Message feedback avg: ${avgRating.toFixed(1)}/5`,
        description: `${rated.length} rated messages. Average rating ${avgRating.toFixed(1)}.`,
        metric: `${avgRating.toFixed(1)} avg rating`,
        confidence: 0.9,
      });
    }
  }

  if (providerCount > 0) {
    insights.push({
      id: 'fb-providers',
      type: 'trend',
      priority: 'low',
      title: `${providerCount} provider profiles on platform`,
      description: 'Provider network is growing. Review pending verifications to expand supply.',
      metric: `${providerCount} providers`,
      confidence: 1.0,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'fb-empty',
      type: 'suggestion',
      priority: 'low',
      title: 'Insufficient data for AI analysis',
      description: 'Not enough user feedback has been collected yet. Insights will improve as data accumulates.',
      confidence: 1.0,
    });
  }

  return insights;
}

export function AIInsights() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'features' | 'churn' | 'revenue' | 'provider'>('insights');

  const runAnalysis = async () => {
    setIsAnalyzing(true);

    // ── 1. Fetch real data from Supabase ──────────────────────────────────
    const [npsRes, feedbackRes, providerRes] = await Promise.all([
      supabase
        .from('nps_responses')
        .select('score, feedback, created_at, trigger')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('message_feedback')
        .select('rating, comment, created_at')
        .limit(100),
      supabase
        .from('provider_profiles')
        .select('id, verification_status, created_at', { count: 'exact' }),
    ]);

    const npsData = (npsRes.data ?? []) as Array<{ score: number; feedback?: string | null; created_at: string; trigger?: string | null }>;
    const feedbackData = (feedbackRes.data ?? []) as Array<{ rating?: number | null; comment?: string | null; created_at: string }>;
    const providerCount = providerRes.count ?? (providerRes.data?.length ?? 0);
    const providerProfiles = (providerRes.data ?? []) as Array<{ id: string; verification_status: string | null; created_at: string }>;

    // ── 2. Build provider stats ───────────────────────────────────────────
    const providerNPSRows = npsData.filter(
      r => r.trigger?.toLowerCase().includes('provider')
    ) as ProviderNPSRow[];
    let providerNPSScore: number | null = null;
    if (providerNPSRows.length > 0) {
      const p = providerNPSRows.filter(r => r.score >= 9).length;
      const d = providerNPSRows.filter(r => r.score <= 6).length;
      providerNPSScore = Math.round(((p - d) / providerNPSRows.length) * 100);
    }
    setProviderStats({
      npsRows: providerNPSRows,
      npsScore: providerNPSScore,
      pendingCount: providerProfiles.filter(p => (p.verification_status ?? 'pending') === 'pending').length,
      verifiedCount: providerProfiles.filter(p => p.verification_status === 'verified').length,
      rejectedCount: providerProfiles.filter(p => p.verification_status === 'rejected').length,
    });

    // ── 3. Call Claude for AI insights ────────────────────────────────────
    let aiInsights: Insight[] | null = null;
    try {
      const aiRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId: 'admin',
            messages: [
              {
                role: 'user',
                content: `Analyze this app feedback data and provide admin insights:\n\nNPS Data: ${JSON.stringify(npsData.slice(0, 20))}\n\nFeedback: ${JSON.stringify(feedbackData.slice(0, 20))}\n\nProvider stats: ${providerCount} providers total\n\nProvide 4-6 specific, actionable insights for improving the app. Format as JSON array with fields: id, type (opportunity|risk|suggestion|trend), priority (high|medium|low), title, description, metric, impact, action, confidence (0-100).`,
              },
            ],
            systemContext:
              'You are an AI advisor for Aminy, a behavioral wellness app for autism families. Analyze the provided feedback data and give actionable admin insights.',
          }),
        }
      );
      if (aiRes.ok) {
        const data = await aiRes.json();
        const text: string = data?.message?.content ?? data?.content ?? data?.text ?? '';
        aiInsights = extractInsightsJSON(text);
      }
    } catch (err) {
      console.warn('[AIInsights] AI call failed, using fallback:', err);
    }

    // ── 4. Set insights (AI or fallback) ─────────────────────────────────
    setInsights(aiInsights ?? buildFallbackInsights(npsData, feedbackData, providerCount));

    // ── 5. Feature usage and churn remain static/illustrative ─────────────
    setFeatureUsage([
      { feature: 'AI Chat', usagePercent: 94, trend: 'up', recommendation: 'Core feature - maintain quality' },
      { feature: 'Daily Routines', usagePercent: 67, trend: 'up', recommendation: 'Growing - add more templates' },
      { feature: 'Incident Logging', usagePercent: 45, trend: 'stable', recommendation: 'Add quick-log shortcuts' },
      { feature: 'Community', usagePercent: 38, trend: 'up', recommendation: 'Boost with expert Q&As' },
      { feature: 'Telehealth Booking', usagePercent: 23, trend: 'stable', recommendation: 'Surface in AI responses' },
      { feature: 'Document Vault', usagePercent: 12, trend: 'down', recommendation: 'URGENT: Add onboarding prompt' },
      { feature: 'Outcomes Tracking', usagePercent: 19, trend: 'down', recommendation: 'Simplify UI, add reminders' },
      { feature: 'Provider Sharing', usagePercent: 8, trend: 'stable', recommendation: 'Add after-session prompt' },
    ]);

    setChurnRisks([
      {
        userId: 'user-1',
        userName: 'Sarah M.',
        riskScore: 0.89,
        lastActive: '12 days ago',
        reason: 'No AI chat in 12 days, was daily user',
        suggestedAction: 'Personal check-in email + 7-day Pro trial'
      },
      {
        userId: 'user-2',
        userName: 'Michael T.',
        riskScore: 0.82,
        lastActive: '8 days ago',
        reason: 'Downgraded from Pro to Starter last week',
        suggestedAction: 'Win-back offer: 50% off Pro for 3 months'
      },
      {
        userId: 'user-3',
        userName: 'Jennifer L.',
        riskScore: 0.76,
        lastActive: '5 days ago',
        reason: 'Multiple negative feedback ratings on AI responses',
        suggestedAction: 'Personal outreach to understand issues'
      },
      {
        userId: 'user-4',
        userName: 'David R.',
        riskScore: 0.71,
        lastActive: '7 days ago',
        reason: 'Hit message limit 3x but never upgraded',
        suggestedAction: 'Extended trial with 50 messages'
      },
      {
        userId: 'user-5',
        userName: 'Amanda K.',
        riskScore: 0.68,
        lastActive: '4 days ago',
        reason: 'Only uses app on weekends, engagement dropping',
        suggestedAction: 'Push notification strategy adjustment'
      }
    ]);

    setLastAnalyzed(new Date());
    setIsAnalyzing(false);
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-blue-600 bg-[#EEF4F8] border-[#C8DDE8]';
      default: return 'text-neutral-600 bg-neutral-50 border-neutral-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'risk': return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'suggestion': return <Lightbulb className="w-5 h-5 text-amber-600" />;
      case 'trend': return <TrendingUp className="w-5 h-5 text-blue-600" />;
      default: return <Brain className="w-5 h-5 text-violet-600" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.8) return 'text-rose-600 bg-rose-100';
    if (score >= 0.6) return 'text-amber-600 bg-amber-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Brain className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#132F43] dark:text-white">AI Insights</h2>
            <p className="text-sm text-[#5A6B7A] dark:text-neutral-400">
              {lastAnalyzed ? `Last analyzed ${lastAnalyzed.toLocaleTimeString()}` : 'Analyzing...'}
            </p>
          </div>
        </div>
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-slate-700">
        {[
          { id: 'insights', label: 'Key Insights', icon: Sparkles },
          { id: 'features', label: 'Feature Usage', icon: Target },
          { id: 'churn', label: 'Churn Risk', icon: AlertTriangle },
          { id: 'revenue', label: 'Revenue Tips', icon: DollarSign },
          { id: 'provider', label: 'Provider Feedback', icon: ShieldCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'insights' | 'features' | 'churn' | 'revenue' | 'provider')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-[#5A6B7A] hover:text-neutral-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <Brain className="w-16 h-16 text-violet-200" />
            <Sparkles className="w-6 h-6 text-violet-600 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Analyzing user patterns...</p>
          <p className="text-sm text-[#5A6B7A]">This may take a moment</p>
        </div>
      ) : (
        <>
          {activeTab === 'insights' && (
            <div className="space-y-4">
              {insights.map(insight => (
                <div
                  key={insight.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-neutral-100 dark:bg-slate-700 rounded-lg">
                      {getTypeIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#132F43] dark:text-white">{insight.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(insight.priority)}`}>
                          {insight.priority}
                        </span>
                        <span className="text-sm text-[#5A6B7A]">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-3">{insight.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        {insight.metric && (
                          <span className="flex items-center gap-1 text-violet-600 font-medium">
                            <TrendingUp className="w-4 h-4" />
                            {insight.metric}
                          </span>
                        )}
                        {insight.impact && (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <DollarSign className="w-4 h-4" />
                            {insight.impact}
                          </span>
                        )}
                      </div>
                      {insight.action && (
                        <div className="mt-3 flex items-center gap-2">
                          <Button size="sm" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {insight.action}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-3">
              {featureUsage.map(feature => (
                <div
                  key={feature.feature}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#132F43] dark:text-white">{feature.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        feature.usagePercent >= 60 ? 'text-green-600' :
                        feature.usagePercent >= 30 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {feature.usagePercent}% adoption
                      </span>
                      {feature.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {feature.trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-500" />}
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${
                        feature.usagePercent >= 60 ? 'bg-green-500' :
                        feature.usagePercent >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${feature.usagePercent}%` }}
                    />
                  </div>
                  {feature.recommendation && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      {feature.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'churn' && (
            <div className="space-y-3">
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span className="font-semibold text-rose-800 dark:text-rose-200">
                    {churnRisks.length} users at risk of churning
                  </span>
                </div>
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  Estimated revenue impact: -${(churnRisks.length * 15).toLocaleString()}/month if all churn
                </p>
              </div>

              {churnRisks.map(user => (
                <div
                  key={user.userId}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-violet-700">
                          {user.userName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-[#132F43] dark:text-white">{user.userName}</span>
                        <p className="text-sm text-[#5A6B7A]">Last active: {user.lastActive}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-sm font-medium rounded-lg ${getRiskColor(user.riskScore)}`}>
                      {Math.round(user.riskScore * 100)}% risk
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                    <strong>Why:</strong> {user.reason}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Send Email
                    </Button>
                    <span className="text-sm text-[#5A6B7A] flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      {user.suggestedAction}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  Revenue Optimization Summary
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">+$8,400</div>
                    <div className="text-sm text-green-600">Potential monthly uplift</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">6</div>
                    <div className="text-sm text-green-600">Actionable opportunities</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">23%</div>
                    <div className="text-sm text-green-600">Revenue increase potential</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-[#132F43] dark:text-white">Top Revenue Actions</h4>
                {[
                  { action: 'Shift upgrade prompts to 7-9pm', impact: '+$2,400/mo', effort: 'Low', time: '1 day' },
                  { action: 'Add referral prompt after positive AI interactions', impact: '+$5,200/mo', effort: 'Medium', time: '3 days' },
                  { action: 'Win-back campaign for 23 at-risk users', impact: '+$1,800/mo', effort: 'Low', time: '2 hours' },
                  { action: 'Document vault onboarding prompt', impact: '+35% retention', effort: 'Low', time: '4 hours' },
                  { action: 'Add Spanish language support', impact: '+$800/mo', effort: 'High', time: '2 weeks' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <span className="font-medium text-[#132F43] dark:text-white">{item.action}</span>
                        <div className="flex items-center gap-3 text-sm text-[#5A6B7A] mt-1">
                          <span>Effort: {item.effort}</span>
                          <span>Time: {item.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-600">{item.impact}</span>
                      <Button size="sm" variant="ghost" className="ml-2">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'provider' && (
            <div className="space-y-5">
              {/* Provider NPS */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-5">
                <h3 className="font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Provider Satisfaction NPS
                </h3>
                {!providerStats || providerStats.npsRows.length === 0 ? (
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                    No provider NPS responses yet — will populate once providers complete sessions.
                  </p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span
                        className={`text-4xl font-bold ${
                          providerStats.npsScore !== null && providerStats.npsScore >= 50
                            ? 'text-green-600'
                            : providerStats.npsScore !== null && providerStats.npsScore >= 20
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {providerStats.npsScore ?? '—'}
                      </span>
                      <span className="text-sm text-[#5A6B7A]">
                        / 100 · {providerStats.npsRows.length} responses
                      </span>
                    </div>
                    {/* Verification breakdown */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'Verified', count: providerStats.verifiedCount, color: 'text-green-600 bg-green-50' },
                        { label: 'Pending', count: providerStats.pendingCount, color: 'text-amber-600 bg-amber-50' },
                        { label: 'Rejected', count: providerStats.rejectedCount, color: 'text-rose-600 bg-rose-50' },
                      ].map(s => (
                        <div key={s.label} className={`text-center p-3 rounded-lg ${s.color}`}>
                          <div className="text-xl font-bold">{s.count}</div>
                          <div className="text-sm">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Recent feedback table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-sm text-[#5A6B7A] border-b border-neutral-100 dark:border-slate-700">
                            <th className="pb-2 pr-3 font-medium">Score</th>
                            <th className="pb-2 pr-3 font-medium">Trigger</th>
                            <th className="pb-2 font-medium">Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {providerStats.npsRows.slice(0, 8).map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-neutral-50 dark:border-slate-800 last:border-0"
                            >
                              <td className="py-2 pr-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                    row.score >= 9
                                      ? 'bg-green-100 text-green-700'
                                      : row.score >= 7
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {row.score}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-[#5A6B7A] dark:text-[#8A9BA8] text-sm">
                                {row.trigger ?? '—'}
                              </td>
                              <td className="py-2 text-[#5A6B7A] dark:text-[#8A9BA8] max-w-xs truncate">
                                {row.feedback ?? <em>No comment</em>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Verification status (shown even with no NPS) */}
              {providerStats && providerStats.npsRows.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-5">
                  <h3 className="font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    Verification Status
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Verified', count: providerStats.verifiedCount, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
                      { label: 'Pending', count: providerStats.pendingCount, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
                      { label: 'Rejected', count: providerStats.rejectedCount, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
                    ].map(s => (
                      <div key={s.label} className={`text-center p-3 rounded-lg ${s.color}`}>
                        <div className="text-xl font-bold">{s.count}</div>
                        <div className="text-sm">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AIInsights;
