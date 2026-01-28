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
  ArrowRight
} from 'lucide-react';
import { Button } from '../ui/button';

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

export function AIInsights() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([]);
  const [activeTab, setActiveTab] = useState<'insights' | 'features' | 'churn' | 'revenue'>('insights');

  // Simulate AI analysis (would call Claude API in production)
  const runAnalysis = async () => {
    setIsAnalyzing(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // AI-generated insights based on user data patterns
    setInsights([
      {
        id: '1',
        type: 'opportunity',
        priority: 'high',
        title: 'Upgrade prompt timing optimization',
        description: 'Users who hit message limits between 7-9pm convert 3x better than daytime. Consider shifting upgrade prompts to evening hours.',
        metric: '+47% conversion potential',
        impact: '+$2,400/mo revenue',
        action: 'Adjust upgrade trigger timing',
        confidence: 0.89
      },
      {
        id: '2',
        type: 'risk',
        priority: 'high',
        title: '23 users at high churn risk',
        description: 'Users who haven\'t used AI chat in 7+ days have 68% churn probability. These users need re-engagement.',
        metric: '23 users affected',
        impact: '-$1,800/mo if churned',
        action: 'Send win-back campaign',
        confidence: 0.92
      },
      {
        id: '3',
        type: 'suggestion',
        priority: 'medium',
        title: 'Document vault underutilized',
        description: 'Only 12% of Pro users have uploaded documents. Users with 3+ documents have 89% retention vs 54% without.',
        metric: '12% adoption',
        impact: '+35% retention potential',
        action: 'Add document upload prompts after onboarding',
        confidence: 0.85
      },
      {
        id: '4',
        type: 'trend',
        priority: 'medium',
        title: 'Behavior strategy queries growing',
        description: 'Queries about meltdowns and tantrums up 34% this week. Consider adding dedicated "Meltdown Mode" quick action.',
        metric: '+34% week-over-week',
        action: 'Build crisis-mode feature',
        confidence: 0.78
      },
      {
        id: '5',
        type: 'opportunity',
        priority: 'high',
        title: 'Referral program underperforming',
        description: 'Only 8% of users have shared referral codes. Users who refer have 2.3x LTV. Need more prominent referral CTAs.',
        metric: '8% share rate',
        impact: '+$5,200/mo potential',
        action: 'Add referral prompt after positive AI interactions',
        confidence: 0.87
      },
      {
        id: '6',
        type: 'suggestion',
        priority: 'low',
        title: 'Spanish language opportunity',
        description: 'Based on user locations and names, ~18% of users may prefer Spanish. Competitors offer Spanish support.',
        metric: '18% addressable',
        impact: '+$800/mo potential',
        action: 'Add Spanish language option',
        confidence: 0.72
      }
    ]);

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
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
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
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">AI Insights</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
      <div className="flex gap-2 border-b border-neutral-200 dark:border-slate-700">
        {[
          { id: 'insights', label: 'Key Insights', icon: Sparkles },
          { id: 'features', label: 'Feature Usage', icon: Target },
          { id: 'churn', label: 'Churn Risk', icon: AlertTriangle },
          { id: 'revenue', label: 'Revenue Tips', icon: DollarSign }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
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
          <p className="text-sm text-neutral-500">This may take a moment</p>
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
                        <h3 className="font-semibold text-neutral-900 dark:text-white">{insight.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(insight.priority)}`}>
                          {insight.priority}
                        </span>
                        <span className="text-xs text-neutral-500">
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
                    <span className="font-medium text-neutral-900 dark:text-white">{feature.feature}</span>
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
                        <span className="font-medium text-neutral-900 dark:text-white">{user.userName}</span>
                        <p className="text-xs text-neutral-500">Last active: {user.lastActive}</p>
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
                    <span className="text-sm text-neutral-500 flex items-center gap-1">
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
                <h4 className="font-medium text-neutral-900 dark:text-white">Top Revenue Actions</h4>
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
                        <span className="font-medium text-neutral-900 dark:text-white">{item.action}</span>
                        <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
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
        </>
      )}
    </div>
  );
}

export default AIInsights;
