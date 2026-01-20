/**
 * Dashboard Focus Card
 * Shows the current top priority task, streak counter, and wins
 */

import React, { useState } from 'react';
import { Target, Flame, CheckCircle2, Loader2, Calendar, Trophy, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useAminyStore } from '../lib/store';
import { CONTENT } from '../lib/content';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface DashboardFocusCardProps {
  userId?: string;
  onComplete?: () => void;
}

export function DashboardFocusCard({ userId = 'default', onComplete }: DashboardFocusCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showMoreTasks, setShowMoreTasks] = useState(false);
  
  const focusTask = useAminyStore(state => state.focusTask);
  const streakCount = useAminyStore(state => state.streaks.current);
  const weeklyWins = useAminyStore(state => state.wins.weeklyWins);
  const allTasks = useAminyStore(state => state.tasks);
  const completeTask = useAminyStore(state => state.completeTask);
  
  // Memoize filtered tasks to prevent infinite loops
  const tasks = React.useMemo(() => allTasks.filter(t => !t.completed), [allTasks]);

  const handleComplete = async () => {
    if (!focusTask || isCompleting) return;

    setIsCompleting(true);
    try {
      completeTask(focusTask.id);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const secondaryTasks = tasks.filter(t => t.id !== focusTask?.id).slice(0, 5);

  return (
    <div
      className="bg-gradient-to-br from-accent/5 via-white to-accent/5 rounded-2xl p-6 border border-accent/20 shadow-sm"
      style={{ contain: 'layout style paint', minHeight: '200px' }}
    >
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-slate-900">{CONTENT.DASHBOARD.FOCUS_CARD_TITLE}</h3>
            <p className="text-sm text-slate-600">One thing at a time</p>
          </div>
        </div>

        {/* Stats: Streak & Wins */}
        <div className="flex items-center gap-2">
          {streakCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 rounded-xl border border-orange-200">
              <Flame className="w-4 h-4 text-orange-500" />
              <div className="text-right">
                <div className="text-sm text-orange-700">{streakCount}</div>
                <div className="text-xs text-orange-600">{CONTENT.DASHBOARD.STREAK_LABEL}</div>
              </div>
            </div>
          )}
          
          {weeklyWins > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
              <Trophy className="w-4 h-4 text-amber-600" />
              <div className="text-right">
                <div className="text-sm text-amber-700">{weeklyWins}</div>
                <div className="text-xs text-amber-600">{CONTENT.DASHBOARD.WINS_LABEL}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Content */}
      {focusTask ? (
        <div className="space-y-4">
          {/* Focus Task */}
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {focusTask.skillType && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      focusTask.skillType === 'speech' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      focusTask.skillType === 'social' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      focusTask.skillType === 'sensory' ? 'bg-green-50 text-green-700 border-green-200' :
                      focusTask.skillType === 'routine' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {focusTask.skillType}
                    </span>
                  )}
                  {focusTask.timeEstimate && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {focusTask.timeEstimate}
                    </span>
                  )}
                </div>
                <p className="text-slate-900">{focusTask.title}</p>
                {focusTask.whyItHelps && (
                  <p className="text-sm text-slate-600 mt-2 italic">
                    💡 {focusTask.whyItHelps}
                  </p>
                )}
              </div>
            </div>

            {/* Complete Button */}
            <Button
              onClick={handleComplete}
              disabled={isCompleting}
              className="w-full bg-accent hover:bg-accent/90 text-white min-h-[44px]"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {CONTENT.DASHBOARD.COMPLETE_TASK}
                </>
              )}
            </Button>
          </div>

          {/* More Tasks Collapsible */}
          {secondaryTasks.length > 0 && (
            <Collapsible open={showMoreTasks} onOpenChange={setShowMoreTasks}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors py-2">
                  <span>{CONTENT.DASHBOARD.MORE_TASKS} ({secondaryTasks.length})</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMoreTasks ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {secondaryTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-white rounded-lg border border-slate-200 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{task.title}</span>
                      {task.timeEstimate && (
                        <span className="text-xs text-slate-500">{task.timeEstimate}</span>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Encouragement */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-1.5 h-1.5 bg-accent rounded-full" />
            <p>You've got this. Just focus on this one thing.</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 mb-2">{CONTENT.DASHBOARD.FOCUS_CARD_EMPTY}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => useAminyStore.getState().setShowUnloadMindModal(true)}
            className="mt-4"
          >
            {CONTENT.DASHBOARD.UNLOAD_MIND_BUTTON}
          </Button>
        </div>
      )}
    </div>
  );
}
