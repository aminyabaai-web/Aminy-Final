/**
 * Routine Adherence Tracker
 * Track scheduled vs completed routines with visual feedback
 *
 * Features:
 * - Daily routine checklist
 * - Completion time tracking
 * - Streak visualization
 * - Weekly adherence percentage
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Check,
  Clock,
  Calendar,
  Flame,
  TrendingUp,
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface Routine {
  id: string;
  name: string;
  scheduledTime: string; // "07:00", "12:30", etc.
  category: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  icon?: string;
}

interface RoutineCompletion {
  id: string;
  routine_id: string;
  routine_name: string;
  scheduled_at: string;
  completed_at: string | null;
  completion_status: 'completed' | 'partial' | 'skipped' | 'delayed';
  delay_minutes: number | null;
}

interface RoutineAdherenceTrackerProps {
  routines: Routine[];
  onRoutineComplete?: (routineId: string, status: 'completed' | 'partial' | 'skipped') => void;
  onAddRoutine?: () => void;
}

export function RoutineAdherenceTracker({
  routines,
  onRoutineComplete,
  onAddRoutine
}: RoutineAdherenceTrackerProps) {
  const [completions, setCompletions] = useState<RoutineCompletion[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    adherence: 0,
    completed: 0,
    total: 0,
    streak: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTodayCompletions();
    loadWeeklyStats();
  }, [routines]);

  const loadTodayCompletions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('routine_completions')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_at', `${today}T00:00:00`)
        .lte('scheduled_at', `${today}T23:59:59`);

      if (data && !error) {
        setCompletions(data);
      }
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeeklyStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString();

      const { data, error } = await supabase
        .from('routine_completions')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_at', weekAgoStr);

      if (data && !error) {
        const completed = data.filter(d => d.completion_status === 'completed' || d.completion_status === 'partial').length;
        const total = data.length || 1;
        const adherence = Math.round((completed / total) * 100);

        // Calculate streak
        const streak = calculateStreak(data);

        setWeeklyStats({
          adherence,
          completed,
          total,
          streak
        });
      }
    } catch (error) {
      console.error('Error loading weekly stats:', error);
    }
  };

  const calculateStreak = (data: RoutineCompletion[]): number => {
    // Group by day and check if all routines were completed
    const dayMap = new Map<string, { completed: number; total: number }>();

    data.forEach(completion => {
      const day = new Date(completion.scheduled_at).toISOString().split('T')[0];
      const current = dayMap.get(day) || { completed: 0, total: 0 };
      current.total++;
      if (completion.completion_status === 'completed' || completion.completion_status === 'partial') {
        current.completed++;
      }
      dayMap.set(day, current);
    });

    // Count consecutive days with 80%+ completion
    let streak = 0;
    const sortedDays = Array.from(dayMap.keys()).sort().reverse();

    for (const day of sortedDays) {
      const stats = dayMap.get(day)!;
      if (stats.completed / stats.total >= 0.8) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const handleMarkComplete = async (routine: Routine, status: 'completed' | 'partial' | 'skipped') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const scheduledAt = new Date(`${today}T${routine.scheduledTime}:00`);

      // Calculate delay if any
      const delayMinutes = status === 'completed' ? Math.max(0, Math.round((now.getTime() - scheduledAt.getTime()) / 60000)) : null;

      const { error } = await supabase
        .from('routine_completions')
        .upsert({
          user_id: user.id,
          routine_id: routine.id,
          routine_name: routine.name,
          scheduled_at: scheduledAt.toISOString(),
          completed_at: status !== 'skipped' ? now.toISOString() : null,
          completion_status: status,
          delay_minutes: delayMinutes
        }, {
          onConflict: 'user_id,routine_id,scheduled_at'
        });

      if (error) throw error;

      // Award calm coins for completion
      if (status === 'completed') {
        await supabase
          .from('calm_coins')
          .insert({
            user_id: user.id,
            amount: 10,
            reason: `Completed ${routine.name}`,
            source_type: 'routine',
            source_id: routine.id
          });

        toast.success(`+10 Calm Coins! Great job completing ${routine.name}`);
      }

      loadTodayCompletions();
      loadWeeklyStats();
      onRoutineComplete?.(routine.id, status);
    } catch (error) {
      console.error('Error marking routine:', error);
      toast.error('Could not save. Please try again.');
    }
  };

  const getRoutineStatus = (routineId: string): RoutineCompletion | undefined => {
    return completions.find(c => c.routine_id === routineId);
  };

  const getCategoryLabel = (category: Routine['category']): string => {
    const labels = {
      morning: 'Morning Routine',
      afternoon: 'Afternoon',
      evening: 'Evening',
      bedtime: 'Bedtime Routine'
    };
    return labels[category];
  };

  const groupedRoutines = routines.reduce((acc, routine) => {
    if (!acc[routine.category]) {
      acc[routine.category] = [];
    }
    acc[routine.category].push(routine);
    return acc;
  }, {} as Record<string, Routine[]>);

  const categoryOrder: Routine['category'][] = ['morning', 'afternoon', 'evening', 'bedtime'];

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{weeklyStats.adherence}%</span>
          </div>
          <p className="text-xs text-slate-500">This Week</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span className="text-2xl font-bold text-accent">{weeklyStats.completed}</span>
          </div>
          <p className="text-xs text-slate-500">Completed</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-2xl font-bold text-orange-500">{weeklyStats.streak}</span>
          </div>
          <p className="text-xs text-slate-500">Day Streak</p>
        </Card>
      </div>

      {/* Weekly Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Weekly Progress</span>
          <span className="text-sm text-slate-500">{weeklyStats.completed}/{weeklyStats.total} routines</span>
        </div>
        <Progress value={weeklyStats.adherence} className="h-2" />
        {weeklyStats.adherence >= 80 && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Amazing consistency! Keep it up!
          </p>
        )}
      </Card>

      {/* Today's Routines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Today's Routines</h3>
          {onAddRoutine && (
            <Button variant="ghost" size="sm" onClick={onAddRoutine}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {categoryOrder.map((category) => {
          const categoryRoutines = groupedRoutines[category];
          if (!categoryRoutines || categoryRoutines.length === 0) return null;

          return (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-medium text-slate-500 mb-3">{getCategoryLabel(category)}</h4>
              <div className="space-y-2">
                {categoryRoutines.map((routine) => {
                  const completion = getRoutineStatus(routine.id);
                  const isCompleted = completion?.completion_status === 'completed';
                  const isPartial = completion?.completion_status === 'partial';
                  const isSkipped = completion?.completion_status === 'skipped';

                  return (
                    <Card
                      key={routine.id}
                      className={`p-4 transition-all ${
                        isCompleted ? 'bg-green-50 border-green-200' :
                        isPartial ? 'bg-yellow-50 border-yellow-200' :
                        isSkipped ? 'bg-slate-50 border-slate-200' :
                        'bg-white hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        <button
                          onClick={() => !isCompleted && handleMarkComplete(routine, 'completed')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isPartial ? 'bg-yellow-500 text-white' :
                            'bg-slate-100 hover:bg-accent hover:text-white'
                          }`}
                        >
                          {isCompleted || isPartial ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        {/* Routine Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isCompleted || isSkipped ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                              {routine.name}
                            </span>
                            {isCompleted && completion?.delay_minutes && completion.delay_minutes > 15 && (
                              <Badge variant="secondary" className="text-xs">
                                {completion.delay_minutes}m late
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Clock className="w-3 h-3" />
                            {routine.scheduledTime}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        {!isCompleted && !isSkipped && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleMarkComplete(routine, 'partial')}
                            >
                              Partial
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-slate-400"
                              onClick={() => handleMarkComplete(routine, 'skipped')}
                            >
                              Skip
                            </Button>
                          </div>
                        )}

                        {isCompleted && (
                          <Badge className="bg-green-100 text-green-700">
                            <Check className="w-3 h-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {routines.length === 0 && (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-700 mb-2">No routines yet</h3>
            <p className="text-sm text-slate-500 mb-4">Add routines to start tracking progress</p>
            {onAddRoutine && (
              <Button onClick={onAddRoutine} className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Routine
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default RoutineAdherenceTracker;
