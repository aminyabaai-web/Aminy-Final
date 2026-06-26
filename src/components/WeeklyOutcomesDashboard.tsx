/**
 * Weekly Outcomes Dashboard Component
 * For Dashboard - displays weekly progress summary
 */

import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useOutcomes } from '../hooks/useOutcomes';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Target,
  CheckCircle,
  Brain,
  Sparkles,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface WeeklyOutcomesDashboardProps {
  childId: string;
  childName: string;
  accessToken?: string;
  onViewDetails?: () => void;
}

export function WeeklyOutcomesDashboard({ 
  childId, 
  childName, 
  accessToken,
  onViewDetails 
}: WeeklyOutcomesDashboardProps) {
  const {
    summary: weeklySummary,
    isLoading: loading,
    error,
    loadOutcomes: generateSummary,
  } = useOutcomes(childId);
  const trends: { metric: string; direction: 'up' | 'down' | 'stable'; value: number }[] = [];
  const fetchTrends = () => {};

  // Calculate week start for display
  const getWeekStart = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  if (loading && !weeklySummary) {
    return (
      <Card className="p-6 bg-gradient-to-br from-white via-transparent/10 to-white">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <p className="text-muted-foreground">Analyzing {childName}'s week...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-orange-200 bg-orange-50/30">
        <div className="flex items-center justify-between">
          <p className="text-sm text-orange-700">
            We couldn't load this week's summary right now.
          </p>
          <Button 
            onClick={() => generateSummary(getWeekStart())}
            variant="ghost" 
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  }

  const summary: {
    totalActivities: number;
    goalsProgress: number;
    sessionsCompleted: number;
    milestones: string[];
    behaviorInsights: string[];
    trend: 'improving' | 'stable' | 'needs_attention';
    aiSummary?: string;
  } = (weeklySummary as unknown as {
    totalActivities: number;
    goalsProgress: number;
    sessionsCompleted: number;
    milestones: string[];
    behaviorInsights: string[];
    trend: 'improving' | 'stable' | 'needs_attention';
    aiSummary?: string;
  }) || {
    totalActivities: 0,
    goalsProgress: 0,
    sessionsCompleted: 0,
    milestones: [],
    behaviorInsights: [],
    trend: 'stable'
  };

  const getTrendIcon = () => {
    switch (summary.trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'needs_attention':
        return <TrendingDown className="w-5 h-5 text-orange-600" />;
      default:
        return <Minus className="w-5 h-5 text-[#5A6B7A]" />;
    }
  };

  const getTrendBadge = () => {
    const badges = {
      improving: { bg: 'bg-green-100', text: 'text-green-700', label: 'Great progress' },
      stable: { bg: 'bg-[#F0EDE8]', text: 'text-[#3A4A57]', label: 'Steady pace' },
      needs_attention: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Let\'s reconnect' }
    };
    
    const badge = badges[summary.trend as keyof typeof badges] ?? badges.stable;
    return (
      <Badge className={`${badge.bg} ${badge.text} border-0`}>
        {badge.label}
      </Badge>
    );
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-white via-transparent/10 to-white border-accent/10 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Brain className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold text-primary">
              This Week's Progress
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            {getTrendBadge()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">Week of</div>
          <div className="text-sm text-primary font-medium">
            {getWeekStart().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {summary.aiSummary && (
        <div className="mb-4 sm:mb-6 p-4 bg-[#6B9080]/10 border border-[#E8E4DF] rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <p className="aminy-affirm text-primary" style={{ fontSize: '0.95rem' }}>
              "{summary.aiSummary}"
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Activities */}
        <div className="p-4 bg-white border border-[#E8E4DF] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Activities</span>
          </div>
          <div className="text-2xl font-semibold text-primary">
            {summary.totalActivities}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            completed this week
          </div>
        </div>

        {/* Goals Progress */}
        <div className="p-4 bg-white border border-[#E8E4DF] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">Goals</span>
          </div>
          <div className="text-2xl font-semibold text-primary">
            {summary.goalsProgress}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            steps forward
          </div>
        </div>
      </div>

      {/* Milestones */}
      {summary.milestones && summary.milestones.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            <span>Recent milestones</span>
          </div>
          <div className="space-y-2">
            {(summary.milestones || []).slice(0, 2).map((milestone: string, index: number) => (
              <div 
                key={index} 
                className="flex items-start gap-2 p-2 bg-[#FDF9F0] border border-yellow-100 rounded"
              >
                <span className="text-yellow-600 text-lg">🎉</span>
                <span className="text-sm text-primary">{milestone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      {summary.sessionsCompleted > 0 && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-primary">
                {summary.sessionsCompleted} {summary.sessionsCompleted === 1 ? 'session' : 'sessions'} this week
              </span>
            </div>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      )}

      {/* View Details Button */}
      {onViewDetails && (
        <Button 
          onClick={onViewDetails}
          variant="ghost" 
          size="sm" 
          className="w-full mt-2 text-accent hover:text-accent/80"
        >
          See full insights
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}

      {/* Encouragement */}
      {!summary.aiSummary && summary.totalActivities > 0 && (
        <p className="aminy-affirm text-muted-foreground mt-4 text-center" style={{ fontSize: '0.95rem' }}>
          You're showing up for {childName}—that's what matters most.
        </p>
      )}

      {summary.totalActivities === 0 && (
        <p className="aminy-affirm text-muted-foreground mt-4 text-center" style={{ fontSize: '0.95rem' }}>
          Ready to start fresh? Every small step with {childName} counts.
        </p>
      )}
    </Card>
  );
}
