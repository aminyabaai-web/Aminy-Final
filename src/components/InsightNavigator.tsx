// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { DisclaimerFooter } from './DisclaimerFooter';
import { UrgentHelpModal } from './UrgentHelpModal';
import { HelpCenter } from './HelpCenter';
import { ChildProfileChip } from './ChildProfileChip';
import { ScreenHeader } from './ui/ScreenHeader';
import { useDisplayNames } from '../lib/name-store';
import { isDemoMode } from '../lib/demo-seed';
import {
  Bell,
  HelpCircle,
  Brain,
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  Heart,
  Sparkles,
  ArrowRight,
  Download,
  Share,
  RefreshCw
} from 'lucide-react';

interface InsightNavigatorProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string;
  connectorData?: Record<string, unknown>;
  onPaywallTrigger?: () => void;
}

interface InsightData {
  category: 'behavior' | 'communication' | 'social' | 'sensory';
  title: string;
  trend: 'up' | 'down' | 'stable';
  value: string;
  change: string;
  description: string;
  recommendations: string[];
  lastUpdated: string;
}

export function InsightNavigator({ 
  userData, 
  userTier = 'starter',
  connectorData,
  onPaywallTrigger 
}: InsightNavigatorProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  // Safe data extraction
  const safeUserData = userData || { parentName: 'Parent', childName: 'Child' };
  const safeChildName = safeUserData.childName || childShort || 'Child';
  const safeCaregiverName = safeUserData.parentName || caregiverShort || 'Parent';

  // Insight data. Real users start empty (a friendly empty state renders until
  // the analytics pipeline produces results). Demo mode shows a rich sample set
  // for investor / AACT walk-throughs — see src/lib/demo-seed.
  const demo = isDemoMode();
  const [insights] = useState<InsightData[]>(demo ? [
    {
      category: 'behavior',
      title: 'Meltdown Frequency',
      trend: 'down',
      value: '2 per week',
      change: '-40%',
      description: 'Significant improvement in emotional regulation over the past month',
      recommendations: [
        'Continue current sensory break schedule',
        'Maintain consistent bedtime routine',
        'Practice deep breathing exercises'
      ],
      lastUpdated: '2 hours ago'
    },
    {
      category: 'communication',
      title: 'Verbal Requests',
      trend: 'up',
      value: '12 per day',
      change: '+25%',
      description: `${safeChildName} is using more words to express needs and wants`,
      recommendations: [
        'Expand vocabulary with picture cards',
        'Practice turn-taking in conversations',
        'Celebrate communication attempts'
      ],
      lastUpdated: '4 hours ago'
    },
    {
      category: 'social',
      title: 'Eye Contact Duration',
      trend: 'up',
      value: '3.2 seconds',
      change: '+60%',
      description: 'Steady improvement in social engagement and connection',
      recommendations: [
        'Continue interactive play sessions',
        'Practice greetings with family',
        'Use preferred activities for engagement'
      ],
      lastUpdated: '6 hours ago'
    },
    {
      category: 'sensory',
      title: 'Sensory Seeking',
      trend: 'stable',
      value: '6 instances',
      change: '0%',
      description: 'Consistent sensory needs, well-managed with current supports',
      recommendations: [
        'Maintain sensory diet schedule',
        'Add new textures gradually',
        'Monitor for any changes in preferences'
      ],
      lastUpdated: '1 day ago'
    }
  ] : []);
  const hasInsights = insights.length > 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'behavior': return <Heart className="w-5 h-5" />;
      case 'communication': return <Brain className="w-5 h-5" />;
      case 'social': return <Eye className="w-5 h-5" />;
      case 'sensory': return <Activity className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'behavior': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
      case 'communication': return 'text-blue-600 bg-[#EEF4F8] dark:text-blue-400 dark:bg-blue-900/30';
      case 'social': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30';
      case 'sensory': return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30';
      default: return 'text-[#5A6B7A] bg-[#FAF7F2] dark:text-slate-400 dark:bg-slate-700';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-600" />;
      case 'stable': return <Clock className="w-4 h-4 text-[#5A6B7A]" />;
      default: return <Clock className="w-4 h-4 text-[#5A6B7A]" />;
    }
  };

  const handleExportInsights = () => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }
    // Mock export functionality
    const data = insights.map(insight => ({
      category: insight.category,
      title: insight.title,
      value: insight.value,
      trend: insight.trend,
      change: insight.change,
      lastUpdated: insight.lastUpdated
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeChildName}-insights-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareInsights = () => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }
    // Mock share functionality
    const summary = `${safeChildName}'s latest insights:\n${insights.map(i => 
      `• ${i.title}: ${i.value} (${i.change})`
    ).join('\n')}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${safeChildName}'s Progress Insights`,
        text: summary
      });
    } else {
      navigator.clipboard.writeText(summary);
    }
  };

  const handleRefreshData = () => {
    // Mock refresh functionality
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-mist dark:bg-slate-900">
      {/* Header — shared chrome via ScreenHeader; urgent-help bell + child chip
          preserved as trailing actions. */}
      <ScreenHeader
        title="AI Insights"
        subtitle={`Progress insights for ${safeChildName}`}
        icon={<Brain className="w-6 h-6" />}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUrgentHelp(true)}
              aria-label="Get urgent help"
              className="text-[#5A6B7A] hover:text-[#1B2733] dark:text-slate-400 dark:hover:text-slate-100"
            >
              <Bell className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelpCenter(true)}
              aria-label="Help center"
              className="text-[#5A6B7A] hover:text-[#1B2733] dark:text-slate-400 dark:hover:text-slate-100"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            <ChildProfileChip
              child={{
                name: safeChildName,
                profileImage: undefined
              }}
              size="sm"
            />
          </>
        }
      />

      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        {/* Action Bar — only when there are insights to act on */}
        {hasInsights && (
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-[#EEF4F8] text-blue-700 border-[#C8DDE8]">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
              <Badge variant="outline">
                Updated {insights[0].lastUpdated}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareInsights}
                className="flex items-center gap-2"
              >
                <Share className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportInsights}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        )}

        {/* Empty state — real users with no analytics yet */}
        {!hasInsights && (
          <Card className="mb-4 sm:mb-6">
            <div className="p-8 sm:p-12 text-center">
              <div className="w-14 h-14 bg-[#EEF4F8] dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-[#1B2733] dark:text-slate-100 mb-2">
                No insights yet
              </h2>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400 max-w-md mx-auto">
                As you log behaviors, sessions, and progress for {safeChildName}, trends and
                personalized recommendations will appear here. Keep tracking to unlock your first insights.
              </p>
            </div>
          </Card>
        )}

        {/* Tier Notice for Starter Users */}
        {hasInsights && userTier === 'starter' && (
          <Card className="mb-4 sm:mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-900 dark:text-amber-100">
                    Limited Insights Available
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Upgrade to Core or Pro to unlock detailed analytics, trend tracking, and export capabilities.
                  </p>
                </div>
                <Button
                  onClick={onPaywallTrigger}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Upgrade
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6 mb-8">
          {insights.map((insight) => (
            <Card key={insight.category} className="reports-card hover:shadow-lg transition-all duration-300">
              <div className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(insight.category)}`}>
                      {getCategoryIcon(insight.category)}
                    </div>
                    <div>
                      <h3 className="font-medium text-[#1B2733] dark:text-slate-100">
                        {insight.title}
                      </h3>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400 capitalize">
                        {insight.category}
                      </p>
                    </div>
                  </div>
                  {getTrendIcon(insight.trend)}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold text-[#1B2733] dark:text-slate-100">
                      {insight.value}
                    </span>
                    <Badge 
                      variant={insight.trend === 'up' ? 'default' : insight.trend === 'down' ? 'default' : 'secondary'}
                      className={
                        insight.trend === 'up' || insight.trend === 'down' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : ''
                      }
                    >
                      {insight.change}
                    </Badge>
                  </div>

                  <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                    {insight.description}
                  </p>

                  <div className="pt-3 border-t border-[#E8E4DF] dark:border-slate-700">
                    <h4 className="text-sm font-medium text-[#1B2733] dark:text-slate-100 mb-2">
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {insight.recommendations.slice(0, userTier === 'starter' ? 1 : 3).map((rec, i) => (
                        <li key={i} className="text-sm text-[#5A6B7A] dark:text-slate-400 flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                      {userTier === 'starter' && insight.recommendations.length > 1 && (
                        <li className="text-sm text-slate-400 dark:text-[#5A6B7A] italic">
                          +{insight.recommendations.length - 1} more recommendations available in Core/Pro
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-3 text-sm text-[#5A6B7A] dark:text-slate-400">
                    <span>Updated {insight.lastUpdated}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary Analytics + Next Steps — derived from the sample set above,
            so only render when insights are present (demo mode). */}
        {hasInsights && (
          <>
            <Card className="mb-4 sm:mb-6">
              <div className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-semibold text-[#1B2733] dark:text-slate-100">
                    Weekly Summary
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">87%</div>
                    <div className="text-sm text-[#5A6B7A] dark:text-slate-400">Overall Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">23</div>
                    <div className="text-sm text-[#5A6B7A] dark:text-slate-400">Data Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">3</div>
                    <div className="text-sm text-[#5A6B7A] dark:text-slate-400">Areas Improving</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">1</div>
                    <div className="text-sm text-[#5A6B7A] dark:text-slate-400">Areas to Monitor</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h2 className="text-lg font-semibold text-[#1B2733] dark:text-slate-100">
                    Recommended Next Steps
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-[#1B2733] dark:text-slate-100">
                        Continue Sensory Schedule
                      </h3>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                        The current sensory break routine is showing excellent results in reducing meltdowns.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#EEF4F8] dark:bg-blue-900/20 rounded-lg">
                    <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-[#1B2733] dark:text-slate-100">
                        Expand Communication Practice
                      </h3>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                        With verbal requests increasing, now is a great time to introduce more complex language.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-[#1B2733] dark:text-slate-100">
                        Monitor Sensory Needs
                      </h3>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                        Sensory seeking behaviors are stable but watch for any changes in preferences.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Modals */}
      {showUrgentHelp && (
        <UrgentHelpModal onClose={() => setShowUrgentHelp(false)} />
      )}

      {showHelpCenter && (
        <HelpCenter onClose={() => setShowHelpCenter(false)} />
      )}

      <DisclaimerFooter />
    </div>
  );
}