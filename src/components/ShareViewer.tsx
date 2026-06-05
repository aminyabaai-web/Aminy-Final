// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Share Viewer - Display shared content to non-authenticated users
 * 
 * Shows:
 * - Weekly Snapshots
 * - Plan Summaries
 * - Streak Cards
 * 
 * Includes parent/child first names and CTA to start free trial
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Share2,
  Calendar,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { 
  getSharedContent,
  formatExpirationDate,
  getContentTypeDisplayName,
  getContentIcon,
  type ShareToken,
  type ShareableContent
} from '../lib/share-token-system';
import { ANIMATIONS } from '../lib/mobile-experience-enhancer';

interface WeeklySnapshotGoal {
  name: string;
  progress: number;
}

interface WeeklySnapshotData {
  weekOf: string;
  completionRate?: number;
  activitiesCompleted?: number;
  streakDays?: number;
  goalsProgress?: number;
  highlights?: string[];
  goals?: WeeklySnapshotGoal[];
}

interface PlanRoutine {
  name: string;
  steps?: string[];
}

interface PlanSummaryData {
  description?: string;
  todaysFocus?: string;
  routines?: PlanRoutine[];
}

interface StreakDay {
  date: string;
  completed: boolean;
}

interface StreakCardData {
  streakCount?: number;
  streakDays?: StreakDay[];
  milestones?: string[];
}

interface ShareViewerProps {
  token: string;
  onStartTrial: () => void;
}

// Safely format an ISO date string; returns '' for missing/invalid values
// (shared content is untrusted, so guard against "Invalid Date").
function safeFormatDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export function ShareViewer({ token, onStartTrial }: ShareViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ShareableContent | null>(null);
  const [shareToken, setShareToken] = useState<ShareToken | null>(null);

  useEffect(() => {
    loadSharedContent();
  }, [token]);

  const loadSharedContent = async () => {
    setLoading(true);
    setError(null);

    const result = await getSharedContent(token);

    if (result.success) {
      setContent(result.content!);
      setShareToken(result.shareToken!);
    } else {
      setError(result.error || 'Failed to load content');
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div {...ANIMATIONS.pulse}>
          <Sparkles className="w-12 h-12 text-accent" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div {...ANIMATIONS.pageEnter}>
          <Card className="max-w-md p-8 text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl text-gray-900 mb-2">Unable to Load Share</h2>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <Button onClick={onStartTrial} className="w-full bg-accent text-white">
              Start Your Free Trial
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!content || !shareToken) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-xl">{getContentIcon(content.type)}</span>
            </div>
            <div>
              <h1 className="text-sm text-gray-900">
                {shareToken.metadata.parentFirstName}'s Share
              </h1>
              <p className="text-xs text-gray-500">
                {getContentTypeDisplayName(content.type)}
              </p>
            </div>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {formatExpirationDate(shareToken.expiresAt)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pb-24">
        <motion.div {...ANIMATIONS.pageSlideUp}>
          {content.type === 'weekly_snapshot' && (
            <WeeklySnapshotView
              data={content.data as unknown as WeeklySnapshotData}
              childName={shareToken.metadata.childFirstName}
              onStartTrial={onStartTrial}
            />
          )}

          {content.type === 'plan_summary' && (
            <PlanSummaryView
              data={content.data as unknown as PlanSummaryData}
              childName={shareToken.metadata.childFirstName}
            />
          )}

          {content.type === 'streak_card' && (
            <StreakCardView
              data={content.data as unknown as StreakCardData}
              childName={shareToken.metadata.childFirstName}
            />
          )}
        </motion.div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto p-4">
          <Card className="bg-gradient-to-br from-accent/5 to-teal-50 border-accent/20 p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-gray-900 mb-1">
                  Create Your Own Progress Snapshots
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Get personalized daily plans, AI coaching, and beautiful progress reports for your family.
                </p>
                <Button 
                  onClick={onStartTrial}
                  className="w-full bg-accent hover:bg-accent/90 text-white"
                >
                  Start Free 7-Day Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  No credit card required • Full access during trial
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ===================================
// Weekly Snapshot View
// ===================================

function WeeklySnapshotView({ data, childName, onStartTrial }: { data: WeeklySnapshotData; childName: string; onStartTrial?: () => void }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg text-gray-900 mb-1">
              {childName}'s Weekly Progress
            </h2>
            <p className="text-sm text-gray-600">
              Week of {safeFormatDate(data.weekOf) || 'this week'}
            </p>
          </div>
          <Badge className="bg-blue-600 text-white">
            <TrendingUp className="w-3 h-3 mr-1" />
            {data.completionRate || 0}% Complete
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl text-blue-600 mb-1">{data.activitiesCompleted || 0}</div>
            <div className="text-xs text-gray-600">Activities</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl text-green-600 mb-1">{data.streakDays || 0}</div>
            <div className="text-xs text-gray-600">Day Streak</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl text-purple-600 mb-1">{data.goalsProgress || 0}%</div>
            <div className="text-xs text-gray-600">Goals</div>
          </div>
        </div>
      </Card>

      {/* Highlights */}
      <Card className="p-5">
        <h3 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          Week Highlights
        </h3>
        <div className="space-y-2">
          {(data.highlights || []).map((highlight: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Goals Progress */}
      {data.goals && data.goals.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Goals Progress
          </h3>
          <div className="space-y-3">
            {data.goals.map((goal: WeeklySnapshotGoal, idx: number) => (
              <div key={`${goal.name}-${idx}`}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700">{goal.name}</span>
                  <span className="text-gray-500">{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-accent rounded-full h-2 transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Locked Features Teaser */}
      <Card className="p-5 bg-gray-50 border-dashed">
        <div className="flex items-center gap-3 mb-3">
          <Lock className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm text-gray-700">More Insights Available</h3>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Unlock detailed behavior analytics, AI coaching insights, and personalized recommendations.
        </p>
        <Button size="sm" variant="outline" className="w-full" onClick={onStartTrial}>
          See All Features
        </Button>
      </Card>
    </div>
  );
}

// ===================================
// Plan Summary View
// ===================================

function PlanSummaryView({ data, childName }: { data: PlanSummaryData; childName: string }) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-lg text-gray-900 mb-2">
          {childName}'s Care Plan
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {data.description || 'Personalized daily activities and routines'}
        </p>

        {/* Today's Focus */}
        {data.todaysFocus && (
          <div className="bg-accent/10 rounded-lg p-4 mb-4">
            <h3 className="text-sm text-accent mb-2">Today's Focus</h3>
            <p className="text-sm text-gray-700">{data.todaysFocus}</p>
          </div>
        )}

        {/* Routines */}
        {data.routines && data.routines.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm text-gray-900">Active Routines</h3>
            {data.routines.map((routine: PlanRoutine, idx: number) => (
              <Card key={`${routine.name}-${idx}`} className="p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span className="text-sm text-gray-900">{routine.name}</span>
                </div>
                <div className="space-y-1">
                  {routine.steps?.slice(0, 3).map((step: string, sIdx: number) => (
                    <div key={sIdx} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-gray-400">{sIdx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  {(routine.steps?.length ?? 0) > 3 && (
                    <p className="text-xs text-gray-400 pl-4">
                      +{(routine.steps?.length ?? 0) - 3} more steps
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Locked Features */}
      <Card className="p-5 bg-gray-50 border-dashed">
        <Lock className="w-5 h-5 text-gray-400 mb-2" />
        <h3 className="text-sm text-gray-700 mb-2">Create Your Own Plans</h3>
        <p className="text-xs text-gray-600">
          Get AI-powered daily plans tailored to your child's unique needs and goals.
        </p>
      </Card>
    </div>
  );
}

// ===================================
// Streak Card View
// ===================================

function StreakCardView({ data, childName }: { data: StreakCardData; childName: string }) {
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🔥</div>
          <h2 className="text-3xl text-gray-900 mb-1">{data.streakCount || 0} Days</h2>
          <p className="text-sm text-gray-600">{childName}'s Current Streak</p>
        </div>

        {/* Streak Calendar */}
        {data.streakDays && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-sm text-gray-900 mb-3">Recent Activity</h3>
            <div className="grid grid-cols-7 gap-2">
              {data.streakDays.slice(-14).map((day: StreakDay, idx: number) => (
                <div
                  key={day.date || idx}
                  className={`aspect-square rounded ${
                    day.completed
                      ? 'bg-accent'
                      : 'bg-gray-200'
                  }`}
                  title={safeFormatDate(day.date)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {data.milestones && data.milestones.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm text-gray-900">Milestones</h3>
            {data.milestones.map((milestone: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">{milestone}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Locked Features */}
      <Card className="p-5 bg-gray-50 border-dashed">
        <Lock className="w-5 h-5 text-gray-400 mb-2" />
        <h3 className="text-sm text-gray-700 mb-2">Build Your Own Streaks</h3>
        <p className="text-xs text-gray-600">
          Track daily progress, celebrate wins, and build lasting habits with your child.
        </p>
      </Card>
    </div>
  );
}
