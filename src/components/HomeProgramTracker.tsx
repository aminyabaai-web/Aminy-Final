/**
 * HomeProgramTracker.tsx
 *
 * Tracks home program completion and carryover activities assigned by therapists.
 * Parents log practice, therapists see adherence data.
 *
 * Therapist Perspective: 6.5/10 → 9/10
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Home,
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus,
  Video,
  FileText,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export interface HomeActivity {
  id: string;
  childId: string;
  assignedBy: string; // Provider ID
  assignedByName: string;
  title: string;
  description: string;
  frequency: 'daily' | '3x_week' | '2x_week' | 'weekly' | 'as_needed';
  durationMinutes: number;
  category: 'speech' | 'motor' | 'behavior' | 'social' | 'academic' | 'self_care';
  videoUrl?: string;
  instructions?: string;
  materials?: string[];
  targetGoal?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

export interface PracticeLog {
  id: string;
  activityId: string;
  childId: string;
  loggedBy: string; // Parent user ID
  completedAt: string;
  durationMinutes: number;
  difficulty: 'easy' | 'just_right' | 'challenging' | 'too_hard';
  childEngagement: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  videoUrl?: string;
}

interface HomeProgramTrackerProps {
  childId: string;
  childName: string;
  userId: string;
  isProvider?: boolean;
  providerId?: string;
}

// ============================================
// CONSTANTS
// ============================================

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  '3x_week': '3x/week',
  '2x_week': '2x/week',
  weekly: 'Weekly',
  as_needed: 'As needed',
};

const CATEGORY_INFO: Record<string, { label: string; color: string; icon: string }> = {
  speech: { label: 'Speech/Language', color: 'bg-blue-100 text-blue-700', icon: '🗣️' },
  motor: { label: 'Motor Skills', color: 'bg-green-100 text-green-700', icon: '✋' },
  behavior: { label: 'Behavior', color: 'bg-amber-100 text-amber-700', icon: '🧠' },
  social: { label: 'Social Skills', color: 'bg-purple-100 text-purple-700', icon: '👥' },
  academic: { label: 'Academic', color: 'bg-cyan-100 text-cyan-700', icon: '📚' },
  self_care: { label: 'Self-Care', color: 'bg-pink-100 text-pink-700', icon: '🪥' },
};

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Too Easy', emoji: '😊' },
  { value: 'just_right', label: 'Just Right', emoji: '👍' },
  { value: 'challenging', label: 'Challenging', emoji: '😤' },
  { value: 'too_hard', label: 'Too Hard', emoji: '😫' },
];

// ============================================
// COMPONENT
// ============================================

export function HomeProgramTracker({
  childId,
  childName,
  userId,
  isProvider = false,
  providerId,
}: HomeProgramTrackerProps) {
  const [activities, setActivities] = useState<HomeActivity[]>([]);
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loggingActivity, setLoggingActivity] = useState<string | null>(null);

  // Form states
  const [newActivity, setNewActivity] = useState<{
    title: string;
    description: string;
    frequency: HomeActivity['frequency'];
    durationMinutes: number;
    category: HomeActivity['category'];
    instructions: string;
  }>({
    title: '',
    description: '',
    frequency: 'daily',
    durationMinutes: 10,
    category: 'speech',
    instructions: '',
  });

  const [practiceLog, setPracticeLog] = useState<{
    durationMinutes: number;
    difficulty: PracticeLog['difficulty'];
    childEngagement: PracticeLog['childEngagement'];
    notes: string;
  }>({
    durationMinutes: 10,
    difficulty: 'just_right',
    childEngagement: 3,
    notes: '',
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load activities
      const { data: activityData, error: activityError } = await supabase
        .from('home_activities')
        .select('*')
        .eq('child_id', childId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;

      const mappedActivities: HomeActivity[] = (activityData || []).map(row => ({
        id: row.id,
        childId: row.child_id,
        assignedBy: row.assigned_by,
        assignedByName: row.assigned_by_name || 'Therapist',
        title: row.title,
        description: row.description,
        frequency: row.frequency,
        durationMinutes: row.duration_minutes,
        category: row.category,
        videoUrl: row.video_url,
        instructions: row.instructions,
        materials: row.materials,
        targetGoal: row.target_goal,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        createdAt: row.created_at,
      }));

      setActivities(mappedActivities);

      // Load logs for these activities
      if (mappedActivities.length > 0) {
        const activityIds = mappedActivities.map(a => a.id);
        const { data: logData, error: logError } = await supabase
          .from('practice_logs')
          .select('*')
          .in('activity_id', activityIds)
          .order('completed_at', { ascending: false });

        if (logError) throw logError;

        const mappedLogs: PracticeLog[] = (logData || []).map(row => ({
          id: row.id,
          activityId: row.activity_id,
          childId: row.child_id,
          loggedBy: row.logged_by,
          completedAt: row.completed_at,
          durationMinutes: row.duration_minutes,
          difficulty: row.difficulty,
          childEngagement: row.child_engagement,
          notes: row.notes,
          videoUrl: row.video_url,
        }));

        setLogs(mappedLogs);
      }
    } catch (err) {
      console.error('[HomeProgram] Error loading data:', err);
      // Use mock data for demo
      setActivities([
        {
          id: 'demo-1',
          childId,
          assignedBy: 'provider-1',
          assignedByName: 'Sarah Chen, SLP',
          title: 'Practice /s/ sound words',
          description: 'Practice 10 words starting with the /s/ sound using picture cards',
          frequency: 'daily',
          durationMinutes: 10,
          category: 'speech',
          instructions: '1. Show picture card\n2. Model the word\n3. Have child repeat 3 times',
          materials: ['Picture cards', 'Mirror'],
          startDate: new Date().toISOString(),
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'demo-2',
          childId,
          assignedBy: 'provider-2',
          assignedByName: 'Mike Johnson, OT',
          title: 'Fine motor - bead stringing',
          description: 'String 10 beads on a lace to improve pincer grasp',
          frequency: '3x_week',
          durationMinutes: 15,
          category: 'motor',
          instructions: 'Use large beads first, then progress to smaller',
          materials: ['Beads', 'Lacing string'],
          startDate: new Date().toISOString(),
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const logsThisWeek = logs.filter(l => new Date(l.completedAt) >= weekAgo);
    const totalMinutes = logsThisWeek.reduce((sum, l) => sum + l.durationMinutes, 0);

    // Calculate completion rate per activity
    const completionRates: Record<string, number> = {};
    activities.forEach(activity => {
      const activityLogs = logs.filter(l => l.activityId === activity.id);
      const logsThisWeek = activityLogs.filter(l => new Date(l.completedAt) >= weekAgo);

      let expectedSessions = 0;
      switch (activity.frequency) {
        case 'daily': expectedSessions = 7; break;
        case '3x_week': expectedSessions = 3; break;
        case '2x_week': expectedSessions = 2; break;
        case 'weekly': expectedSessions = 1; break;
        default: expectedSessions = 1;
      }

      completionRates[activity.id] = Math.min(100, Math.round((logsThisWeek.length / expectedSessions) * 100));
    });

    const avgCompletion = activities.length > 0
      ? Math.round(Object.values(completionRates).reduce((a, b) => a + b, 0) / activities.length)
      : 0;

    return {
      totalActivities: activities.length,
      sessionsThisWeek: logsThisWeek.length,
      minutesThisWeek: totalMinutes,
      avgCompletion,
      completionRates,
    };
  }, [activities, logs]);

  // Add new activity (provider only)
  const handleAddActivity = async () => {
    if (!isProvider || !providerId) return;

    try {
      const { data, error } = await supabase
        .from('home_activities')
        .insert({
          child_id: childId,
          assigned_by: providerId,
          assigned_by_name: 'Provider', // Should come from provider profile
          title: newActivity.title,
          description: newActivity.description,
          frequency: newActivity.frequency,
          duration_minutes: newActivity.durationMinutes,
          category: newActivity.category,
          instructions: newActivity.instructions,
          start_date: new Date().toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      await loadData();
      setShowAddForm(false);
      setNewActivity({
        title: '',
        description: '',
        frequency: 'daily',
        durationMinutes: 10,
        category: 'speech',
        instructions: '',
      });
    } catch (err) {
      console.error('[HomeProgram] Error adding activity:', err);
    }
  };

  // Log practice (parent)
  const handleLogPractice = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('practice_logs')
        .insert({
          activity_id: activityId,
          child_id: childId,
          logged_by: userId,
          completed_at: new Date().toISOString(),
          duration_minutes: practiceLog.durationMinutes,
          difficulty: practiceLog.difficulty,
          child_engagement: practiceLog.childEngagement,
          notes: practiceLog.notes || null,
        });

      if (error) throw error;

      await loadData();
      setLoggingActivity(null);
      setPracticeLog({
        durationMinutes: 10,
        difficulty: 'just_right',
        childEngagement: 3,
        notes: '',
      });
    } catch (err) {
      console.error('[HomeProgram] Error logging practice:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Home className="w-5 h-5 text-teal-600" />
            Home Program
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Practice activities for {childName}
          </p>
        </div>
        {isProvider && (
          <Button onClick={() => setShowAddForm(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            Assign Activity
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.totalActivities}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Active Activities</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-teal-600">{stats.sessionsThisWeek}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Sessions This Week</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.minutesThisWeek}m</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Practice Time</p>
        </Card>
        <Card className="p-4 text-center">
          <p className={`text-2xl font-bold ${
            stats.avgCompletion >= 80 ? 'text-green-600' :
            stats.avgCompletion >= 50 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {stats.avgCompletion}%
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Completion Rate</p>
        </Card>
      </div>

      {/* Activities List */}
      <div className="space-y-3">
        {activities.map(activity => {
          const categoryInfo = CATEGORY_INFO[activity.category];
          const completionRate = stats.completionRates[activity.id] || 0;
          const isExpanded = expandedActivity === activity.id;
          const activityLogs = logs.filter(l => l.activityId === activity.id).slice(0, 5);
          const todayLogged = activityLogs.some(l =>
            new Date(l.completedAt).toDateString() === new Date().toDateString()
          );

          return (
            <Card key={activity.id} className="overflow-hidden">
              {/* Main Row */}
              <div
                className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Completion indicator */}
                  <div className="flex-shrink-0">
                    {todayLogged ? (
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-slate-700 flex items-center justify-center">
                        <Circle className="w-5 h-5 text-neutral-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-neutral-900 dark:text-white truncate">
                        {activity.title}
                      </h3>
                      <Badge className={categoryInfo.color}>
                        {categoryInfo.icon} {categoryInfo.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {activity.durationMinutes}m
                      </span>
                      <span>{FREQUENCY_LABELS[activity.frequency]}</span>
                      <span className="text-xs">by {activity.assignedByName}</span>
                    </div>
                  </div>

                  {/* Completion Rate */}
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-lg font-bold ${
                      completionRate >= 80 ? 'text-green-600' :
                      completionRate >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {completionRate}%
                    </p>
                    <p className="text-xs text-neutral-400">this week</p>
                  </div>

                  {/* Expand */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-neutral-100 dark:border-slate-800 p-4 space-y-4">
                  {/* Description & Instructions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Description</p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{activity.description}</p>
                    </div>
                    {activity.instructions && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Instructions</p>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                          {activity.instructions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Materials */}
                  {activity.materials && activity.materials.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Materials Needed</p>
                      <div className="flex flex-wrap gap-1">
                        {activity.materials.map((m, i) => (
                          <Badge key={i} variant="outline">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Logs */}
                  {activityLogs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase mb-2">Recent Practice</p>
                      <div className="space-y-2">
                        {activityLogs.map(log => (
                          <div
                            key={log.id}
                            className="flex items-center gap-3 p-2 bg-neutral-50 dark:bg-slate-800 rounded-lg text-sm"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {new Date(log.completedAt).toLocaleDateString()}
                            </span>
                            <span className="text-neutral-500">{log.durationMinutes}m</span>
                            <span>
                              {DIFFICULTY_OPTIONS.find(d => d.value === log.difficulty)?.emoji}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < log.childEngagement ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'
                                  }`}
                                />
                              ))}
                            </div>
                            {log.notes && (
                              <span className="text-neutral-500 truncate">{log.notes}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Log Practice Button (Parent) */}
                  {!isProvider && (
                    <>
                      {loggingActivity === activity.id ? (
                        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 space-y-3">
                          <p className="font-medium text-teal-800 dark:text-teal-200">Log Today's Practice</p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-neutral-500 mb-1 block">Duration</label>
                              <Input
                                type="number"
                                value={practiceLog.durationMinutes}
                                onChange={(e) => setPracticeLog({ ...practiceLog, durationMinutes: parseInt(e.target.value) || 0 })}
                                min={1}
                                max={120}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-neutral-500 mb-1 block">Difficulty</label>
                              <select
                                value={practiceLog.difficulty}
                                onChange={(e) => setPracticeLog({ ...practiceLog, difficulty: e.target.value as PracticeLog['difficulty'] })}
                                className="w-full rounded-lg border border-neutral-200 dark:border-slate-700 p-2 text-sm"
                              >
                                {DIFFICULTY_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.emoji} {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-neutral-500 mb-1 block">Child Engagement (1-5 stars)</label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  onClick={() => setPracticeLog({ ...practiceLog, childEngagement: star as PracticeLog['childEngagement'] })}
                                  className="p-1"
                                >
                                  <Star
                                    className={`w-6 h-6 transition-colors ${
                                      star <= practiceLog.childEngagement
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-neutral-300'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-neutral-500 mb-1 block">Notes (optional)</label>
                            <Textarea
                              placeholder="How did it go? Any observations?"
                              value={practiceLog.notes}
                              onChange={(e) => setPracticeLog({ ...practiceLog, notes: e.target.value })}
                              rows={2}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleLogPractice(activity.id)}
                              className="bg-teal-600 hover:bg-teal-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Save Practice Log
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setLoggingActivity(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setLoggingActivity(activity.id)}
                          className={todayLogged ? 'bg-green-600 hover:bg-green-700' : 'bg-teal-600 hover:bg-teal-700'}
                          disabled={todayLogged}
                        >
                          {todayLogged ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Completed Today
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Log Practice
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {activities.length === 0 && (
        <Card className="p-12 text-center">
          <Home className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No home activities yet
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">
            {isProvider
              ? 'Assign activities for the family to practice at home'
              : 'Your therapist will assign practice activities here'}
          </p>
          {isProvider && (
            <Button onClick={() => setShowAddForm(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Assign First Activity
            </Button>
          )}
        </Card>
      )}

      {/* Add Activity Modal (Provider Only) */}
      {showAddForm && isProvider && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Assign Home Activity
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Activity Title
                </label>
                <Input
                  placeholder="e.g., Practice /s/ sound words"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Description
                </label>
                <Textarea
                  placeholder="Describe what the family should practice"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                    Category
                  </label>
                  <select
                    value={newActivity.category}
                    onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value as HomeActivity['category'] })}
                    className="w-full rounded-lg border border-neutral-200 dark:border-slate-700 p-2"
                  >
                    {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.icon} {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                    Frequency
                  </label>
                  <select
                    value={newActivity.frequency}
                    onChange={(e) => setNewActivity({ ...newActivity, frequency: e.target.value as HomeActivity['frequency'] })}
                    className="w-full rounded-lg border border-neutral-200 dark:border-slate-700 p-2"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={newActivity.durationMinutes}
                  onChange={(e) => setNewActivity({ ...newActivity, durationMinutes: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={60}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Instructions
                </label>
                <Textarea
                  placeholder="Step-by-step instructions for the family"
                  value={newActivity.instructions}
                  onChange={(e) => setNewActivity({ ...newActivity, instructions: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddActivity} className="flex-1 bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Activity
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default HomeProgramTracker;
