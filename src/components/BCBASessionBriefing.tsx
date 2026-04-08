// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  Brain
} from 'lucide-react';

interface BCBASessionBriefingProps {
  familyId: string;
  childName: string;
  parentName: string;
  sessionType: 'bcba-30' | 'bcba-45' | 'bcba-d-45' | 'rbt-30' | 'rbt-45';
  scheduledTime?: string;
  onStartSession?: () => void;
}

interface BriefingData {
  summary: string;
  whatsWorking: string[];
  whatsNotWorking: string[];
  opportunities: string[];
  recommendedGuidance: string[];
  recentProgress: {
    area: string;
    trend: 'up' | 'down' | 'stable';
    detail: string;
  }[];
  parentMood: 'stressed' | 'hopeful' | 'neutral' | 'overwhelmed';
  recentConcerns: string[];
  lastSessionHighlights: string[];
  vaultInsights: string[];
  suggestedTopics: string[];
}

export function BCBASessionBriefing({
  familyId,
  childName,
  parentName,
  sessionType,
  scheduledTime,
  onStartSession
}: BCBASessionBriefingProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'working', 'notWorking']));

  useEffect(() => {
    loadBriefing();
  }, [familyId]);

  const loadBriefing = async () => {
    setIsLoading(true);

    // Simulate API call - in production, this would call the AI brain
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock briefing data - in production, this comes from the AI analyzing all family data
    setBriefing({
      summary: `${childName} is a ${getAge()} year-old working on communication and daily living skills. Recent focus has been on morning routines and emotional regulation. ${parentName} has been consistently implementing visual schedules with good results, but reports increased anxiety around transitions. The family is motivated and engaged.`,

      whatsWorking: [
        'Visual schedule for morning routine - 80% independence achieved',
        'First-Then board reducing tantrums during transitions',
        'Token economy system motivating task completion',
        'Parent using calm voice during meltdowns - recovery time reduced by 50%'
      ],

      whatsNotWorking: [
        'Evening wind-down routine still inconsistent',
        'New food introduction attempts causing refusal behaviors',
        'Homework time remains a significant challenge',
        'Sibling interactions escalating to physical aggression'
      ],

      opportunities: [
        `${childName} showing readiness for peer play - consider social skills group`,
        'Parent interest in sensory diet implementation',
        'School willing to collaborate on IEP modifications',
        'Extended family requesting guidance on how to help'
      ],

      recommendedGuidance: [
        'Review and simplify evening routine - may be too many steps',
        'Introduce "food bridge" strategy for new food acceptance',
        'Create homework visual schedule with built-in breaks',
        'Teach sibling conflict resolution script',
        'Validate parent stress - acknowledge their hard work'
      ],

      recentProgress: [
        { area: 'Morning Routine', trend: 'up', detail: '40% → 80% independence in 6 weeks' },
        { area: 'Communication', trend: 'up', detail: 'Using 3-word phrases consistently' },
        { area: 'Emotional Regulation', trend: 'stable', detail: 'Meltdowns reduced but still daily' },
        { area: 'Sleep', trend: 'down', detail: 'Bedtime resistance increased this week' }
      ],

      parentMood: 'stressed',

      recentConcerns: [
        'Worried about upcoming IEP meeting',
        'Exhausted from sleep disruptions',
        'Questioning if current strategies are enough'
      ],

      lastSessionHighlights: [
        'Introduced token economy system',
        'Practiced calm response to meltdowns',
        'Set goal for morning routine independence'
      ],

      vaultInsights: [
        'Latest evaluation (3 months ago) noted sensory processing differences',
        'IEP includes speech goals - align with home strategies',
        'Medical records show no medication changes recently'
      ],

      suggestedTopics: [
        'Review evening routine and troubleshoot',
        'Prepare for IEP meeting - parent advocacy training',
        'Sibling support strategies',
        'Parent self-care check-in'
      ]
    });

    setIsLoading(false);
  };

  const getAge = () => {
    // Mock age - in production comes from child profile
    return 5;
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const SectionHeader = ({
    id,
    icon: Icon,
    title,
    count,
    color
  }: {
    id: string;
    icon: React.ElementType;
    title: string;
    count?: number;
    color: string;
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-medium text-gray-900">{title}</span>
        {count !== undefined && (
          <Badge variant="outline" className="text-xs">{count}</Badge>
        )}
      </div>
      {expandedSections.has(id) ? (
        <ChevronUp className="w-4 h-4 text-gray-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">Preparing Your Briefing</h3>
          <p className="text-sm text-gray-500">
            Analyzing {childName}'s data, progress, and recent activity...
          </p>
        </div>
      </Card>
    );
  }

  if (!briefing) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="font-medium text-gray-900 mb-2">Could not load briefing</h3>
        <Button onClick={loadBriefing} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-xl">
              <Brain className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Session Briefing: {childName}
              </h2>
              <p className="text-sm text-gray-600">
                Parent: {parentName}
              </p>
            </div>
          </div>
          <Badge className="bg-teal-100 text-teal-700">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Generated
          </Badge>
        </div>

        {scheduledTime && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Calendar className="w-4 h-4" />
            <span>Scheduled: {scheduledTime}</span>
          </div>
        )}

        {/* Parent Mood Indicator */}
        <div className={`p-3 rounded-lg mb-4 ${
          briefing.parentMood === 'stressed' || briefing.parentMood === 'overwhelmed'
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Parent Status:
              <span className={`ml-2 ${
                briefing.parentMood === 'stressed' ? 'text-amber-700' :
                briefing.parentMood === 'overwhelmed' ? 'text-red-700' :
                briefing.parentMood === 'hopeful' ? 'text-green-700' :
                'text-gray-700'
              }`}>
                {briefing.parentMood.charAt(0).toUpperCase() + briefing.parentMood.slice(1)}
              </span>
            </span>
          </div>
          {briefing.parentMood === 'stressed' && (
            <p className="text-xs text-amber-600 mt-1 ml-6">
              Consider starting with emotional check-in and validation
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white/70 rounded-lg p-4">
          <p className="text-gray-700 leading-relaxed">{briefing.summary}</p>
        </div>
      </Card>

      {/* Progress At A Glance */}
      <Card className="p-3 sm:p-4">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-600" />
          Recent Progress
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {briefing.recentProgress.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                item.trend === 'up' ? 'bg-green-50 border-green-200' :
                item.trend === 'down' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {item.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                {item.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                {item.trend === 'stable' && <span className="w-4 h-4 text-gray-400">—</span>}
                <span className="font-medium text-sm">{item.area}</span>
              </div>
              <p className="text-xs text-gray-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* What's Working */}
      <Card className="overflow-hidden">
        <SectionHeader
          id="working"
          icon={CheckCircle}
          title="What's Working"
          count={briefing.whatsWorking.length}
          color="bg-green-100 text-green-700"
        />
        {expandedSections.has('working') && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {briefing.whatsWorking.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* What's Not Working */}
      <Card className="overflow-hidden">
        <SectionHeader
          id="notWorking"
          icon={AlertTriangle}
          title="What's Not Working"
          count={briefing.whatsNotWorking.length}
          color="bg-amber-100 text-amber-700"
        />
        {expandedSections.has('notWorking') && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {briefing.whatsNotWorking.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Opportunities */}
      <Card className="overflow-hidden">
        <SectionHeader
          id="opportunities"
          icon={Lightbulb}
          title="Opportunities"
          count={briefing.opportunities.length}
          color="bg-blue-100 text-blue-700"
        />
        {expandedSections.has('opportunities') && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {briefing.opportunities.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Recommended Guidance */}
      <Card className="overflow-hidden border-teal-200 bg-teal-50/30">
        <SectionHeader
          id="guidance"
          icon={Target}
          title="Recommended Guidance for Parent"
          count={briefing.recommendedGuidance.length}
          color="bg-teal-100 text-teal-700"
        />
        {expandedSections.has('guidance') && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {briefing.recommendedGuidance.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <Target className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Recent Parent Concerns */}
      <Card className="overflow-hidden">
        <SectionHeader
          id="concerns"
          icon={MessageSquare}
          title="Recent Parent Concerns"
          count={briefing.recentConcerns.length}
          color="bg-violet-100 text-violet-700"
        />
        {expandedSections.has('concerns') && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {briefing.recentConcerns.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <MessageSquare className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Vault Insights */}
      <Card className="overflow-hidden">
        <SectionHeader
          id="vault"
          icon={FileText}
          title="From Documents (Vault)"
          count={briefing.vaultInsights.length}
          color="bg-gray-100 text-gray-700"
        />
        {expandedSections.has('vault') && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {briefing.vaultInsights.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Suggested Session Topics */}
      <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          Suggested Session Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {briefing.suggestedTopics.map((topic, idx) => (
            <Badge
              key={idx}
              className="bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 cursor-pointer"
            >
              {topic}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Start Session CTA */}
      {onStartSession && (
        <Button
          onClick={onStartSession}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6"
          size="lg"
        >
          <Clock className="w-5 h-5 mr-2" />
          Start Session with {parentName}
        </Button>
      )}
    </div>
  );
}
