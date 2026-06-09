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
  Calendar,
  Brain
} from 'lucide-react';
import { ScreenHeader } from './ui/ScreenHeader';
import { isDemoMode } from '../lib/demo-seed';
import { supabase } from '../utils/supabase/client';

interface BCBASessionBriefingProps {
  familyId: string;
  childName: string;
  parentName: string;
  sessionType: 'bcba-30' | 'bcba-45' | 'bcba-d-45' | 'rbt-30' | 'rbt-45';
  scheduledTime?: string;
  onStartSession?: () => void;
  /** Back/exit affordance — renders a back button in the header when provided */
  onBack?: () => void;
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
  onStartSession,
  onBack
}: BCBASessionBriefingProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'working', 'notWorking']));

  useEffect(() => {
    loadBriefing();
  }, [familyId]);

  const loadBriefing = async () => {
    setIsLoading(true);

    if (isDemoMode()) {
      // Demo mode: fabricated sample data
      setBriefing({
        summary: `${childName} is a ${getAge()} year-old working on communication and daily living skills. Recent focus has been on morning routines and emotional regulation. ${parentName} has been consistently implementing visual schedules with good results, but reports increased anxiety around transitions.`,
        whatsWorking: [
          'Visual schedule for morning routine - 80% independence achieved',
          'First-Then board reducing tantrums during transitions',
          'Token economy system motivating task completion',
        ],
        whatsNotWorking: [
          'Evening wind-down routine still inconsistent',
          'Homework time remains a significant challenge',
        ],
        opportunities: [
          `${childName} showing readiness for peer play`,
          'Parent interest in sensory diet implementation',
        ],
        recommendedGuidance: [
          'Review and simplify evening routine',
          'Create homework visual schedule with built-in breaks',
          'Validate parent stress - acknowledge their hard work',
        ],
        recentProgress: [
          { area: 'Morning Routine', trend: 'up', detail: '40% → 80% independence in 6 weeks' },
          { area: 'Communication', trend: 'up', detail: 'Using 3-word phrases consistently' },
          { area: 'Emotional Regulation', trend: 'stable', detail: 'Meltdowns reduced but still daily' },
        ],
        parentMood: 'stressed',
        recentConcerns: ['Worried about upcoming IEP meeting', 'Exhausted from sleep disruptions'],
        lastSessionHighlights: ['Introduced token economy system', 'Set goal for morning routine independence'],
        vaultInsights: ['Latest evaluation noted sensory processing differences'],
        suggestedTopics: ['Review evening routine', 'Sibling support strategies', 'Parent self-care check-in'],
      });
      setIsLoading(false);
      return;
    }

    // Real mode: pull live data from Supabase
    try {
      const [goalsRes, logsRes, notesRes] = await Promise.all([
        supabase
          .from('goals')
          .select('title, status, target_behavior, progress_notes, updated_at')
          .eq('user_id', familyId)
          .eq('status', 'active')
          .limit(8),
        supabase
          .from('behavior_logs')
          .select('behavior_type, intensity, notes, is_positive, created_at')
          .eq('user_id', familyId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('session_notes')
          .select('content, session_type, created_at')
          .eq('user_id', familyId)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const goals = goalsRes.data ?? [];
      const logs = logsRes.data ?? [];
      const notes = notesRes.data ?? [];

      const positiveLogs = logs.filter(l => l.is_positive);
      const challengeLogs = logs.filter(l => !l.is_positive);

      const working = [
        ...goals.slice(0, 3).map(g => g.title).filter(Boolean),
        ...positiveLogs.slice(0, 2).map(l => l.notes || l.behavior_type).filter(Boolean),
      ];

      const notWorking = challengeLogs.slice(0, 3).map(l => l.notes || l.behavior_type).filter(Boolean);

      const lastNote = notes[0];
      const lastSessionHighlights = lastNote
        ? [`Last session (${new Date(lastNote.created_at).toLocaleDateString()}): ${lastNote.content?.slice(0, 120) ?? 'Session recorded'}`]
        : [];

      const summary = [
        goals.length > 0
          ? `${childName} has ${goals.length} active goal${goals.length !== 1 ? 's' : ''}: ${goals.map(g => g.title).slice(0, 2).join(', ')}.`
          : `No active goals found for ${childName}.`,
        logs.length > 0
          ? `${positiveLogs.length} positive and ${challengeLogs.length} challenging behavior${challengeLogs.length !== 1 ? 's' : ''} logged recently.`
          : 'No recent behavior logs.',
      ].join(' ');

      setBriefing({
        summary,
        whatsWorking: working.length > 0 ? working : ['No recent positive data logged'],
        whatsNotWorking: notWorking.length > 0 ? notWorking : ['No challenge behaviors logged recently'],
        opportunities: goals.slice(0, 3).map(g => `Continue: ${g.title}`),
        recommendedGuidance: ['Review progress toward active goals', 'Discuss any new concerns with the family'],
        recentProgress: goals.slice(0, 4).map(g => ({
          area: g.title,
          trend: 'stable' as const,
          detail: g.progress_notes || 'In progress',
        })),
        parentMood: 'neutral',
        recentConcerns: [],
        lastSessionHighlights,
        vaultInsights: [],
        suggestedTopics: goals.map(g => g.title).slice(0, 3),
      });
    } catch {
      setBriefing(null);
    }

    setIsLoading(false);
  };

  const getAge = () => 'school-age';

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
      className="w-full flex items-center justify-between p-3 hover:bg-[#FAF7F2] rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-medium text-[#1B2733]">{title}</span>
        {count !== undefined && (
          <Badge variant="outline" className="text-xs">{count}</Badge>
        )}
      </div>
      {expandedSections.has(id) ? (
        <ChevronUp className="w-4 h-4 text-[#8A9BA8]" />
      ) : (
        <ChevronDown className="w-4 h-4 text-[#8A9BA8]" />
      )}
    </button>
  );

  // Shared page chrome so the briefing screen matches every other provider
  // screen (background, header, back affordance, bottom padding).
  const PageHeader = (
    <ScreenHeader
      title="Session Briefing"
      subtitle={`Prep for your session with ${parentName}`}
      icon={<Brain className="w-6 h-6" />}
      onBack={onBack}
      variant="flat"
    />
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mist pb-24">
        {PageHeader}
        <div className="px-4 mt-4">
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border-3 border-[#6B9080] border-t-transparent rounded-full animate-spin mb-4" />
              <h3 className="font-medium text-[#1B2733] mb-2">Preparing Your Briefing</h3>
              <p className="text-sm text-[#5A6B7A]">
                Analyzing {childName}'s data, progress, and recent activity...
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="min-h-screen bg-mist pb-24">
        {PageHeader}
        <div className="px-4 mt-4">
          <Card className="p-8 text-center">
            <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="font-medium text-[#1B2733] mb-2">Briefing not available yet</h3>
            <p className="text-sm text-[#5A6B7A] mb-4">
              AI session briefings for {childName} will appear here once enough
              session and progress data has been recorded.
            </p>
            {onStartSession && (
              <Button onClick={onStartSession} variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Start Session with {parentName}
              </Button>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist pb-24">
      {PageHeader}
      <div className="space-y-3 sm:space-y-4 sm:space-y-6 px-4 mt-4">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-[#FAF7F2] to-cyan-50 border-[#6B9080]/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#6B9080]/10 rounded-xl">
              <Brain className="w-6 h-6 text-[#6B9080]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">
                Session Briefing: {childName}
              </h2>
              <p className="text-sm text-[#5A6B7A]">
                Parent: {parentName}
              </p>
            </div>
          </div>
          <Badge className="bg-[#6B9080]/10 text-[#6B9080]">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Generated
          </Badge>
        </div>

        {scheduledTime && (
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A] mb-4">
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
            <User className="w-4 h-4 text-[#5A6B7A]" />
            <span className="text-sm font-medium text-[#3A4A57]">
              Parent Status:
              <span className={`ml-2 ${
                briefing.parentMood === 'stressed' ? 'text-amber-700' :
                briefing.parentMood === 'overwhelmed' ? 'text-red-700' :
                briefing.parentMood === 'hopeful' ? 'text-green-700' :
                'text-[#3A4A57]'
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
          <p className="text-[#3A4A57] leading-relaxed">{briefing.summary}</p>
        </div>
      </Card>

      {/* Progress At A Glance */}
      <Card className="p-3 sm:p-4">
        <h3 className="font-medium text-[#1B2733] mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#6B9080]" />
          Recent Progress
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {briefing.recentProgress.map((item) => (
            <div
              key={item.area}
              className={`p-3 rounded-lg border ${
                item.trend === 'up' ? 'bg-green-50 border-green-200' :
                item.trend === 'down' ? 'bg-red-50 border-red-200' :
                'bg-[#FAF7F2] border-[#E8E4DF]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {item.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                {item.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                {item.trend === 'stable' && <span className="w-4 h-4 text-[#8A9BA8]">—</span>}
                <span className="font-medium text-sm">{item.area}</span>
              </div>
              <p className="text-xs text-[#5A6B7A]">{item.detail}</p>
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
              {briefing.whatsWorking.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#3A4A57]">
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
              {briefing.whatsNotWorking.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#3A4A57]">
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
              {briefing.opportunities.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#3A4A57]">
                  <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Recommended Guidance */}
      <Card className="overflow-hidden border-[#6B9080]/20 bg-[#6B9080]/10/30">
        <SectionHeader
          id="guidance"
          icon={Target}
          title="Recommended Guidance for Parent"
          count={briefing.recommendedGuidance.length}
          color="bg-[#6B9080]/10 text-[#6B9080]"
        />
        {expandedSections.has('guidance') && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {briefing.recommendedGuidance.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#3A4A57]">
                  <Target className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
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
              {briefing.recentConcerns.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#3A4A57]">
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
          color="bg-[#F0EDE8] text-[#3A4A57]"
        />
        {expandedSections.has('vault') && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {briefing.vaultInsights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#3A4A57]">
                  <FileText className="w-4 h-4 text-[#5A6B7A] mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Suggested Session Topics */}
      <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <h3 className="font-medium text-[#1B2733] mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          Suggested Session Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {briefing.suggestedTopics.map((topic) => (
            <Badge
              key={topic}
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
          className="w-full bg-primary hover:bg-primary text-white py-6"
          size="lg"
        >
          <Clock className="w-5 h-5 mr-2" />
          Start Session with {parentName}
        </Button>
      )}
      </div>
    </div>
  );
}
