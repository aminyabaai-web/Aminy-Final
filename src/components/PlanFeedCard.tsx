import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Target,
  CalendarDays,
  CheckCircle,
  Circle,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Eye
} from 'lucide-react';

interface PlanFeedCardProps {
  childName: string;
  planData?: {
    vision: Array<{
      id: string;
      title: string;
      bigPicture: string;
    }>;
    monthlyGoals: Array<{
      id: string;
      title: string;
      progress: number;
    }>;
    weeklyFocus: Array<{
      id: string;
      title: string;
      progress: number;
      completed: boolean;
      dailyActions: Array<{
        id: string;
        action: string;
        completed: boolean;
        day: string;
      }>;
    }>;
  };
  onNavigateToPlan?: () => void;
}

export function PlanFeedCard({ 
  childName, 
  planData, 
  onNavigateToPlan 
}: PlanFeedCardProps) {
  // Get today's actions from current weekly focus
  const getCurrentWeekFocus = () => {
    if (!planData?.weeklyFocus || planData.weeklyFocus.length === 0) return null;
    
    // Find the active (incomplete) week or the most recent one
    const activeWeek = planData.weeklyFocus.find(week => !week.completed) || planData.weeklyFocus[0];
    return activeWeek;
  };

  const getTodaysDayOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date().getDay()];
  };

  const currentWeek = getCurrentWeekFocus();
  const todaysDay = getTodaysDayOfWeek();
  const todaysActions = currentWeek?.dailyActions.filter(action => 
    action.day === todaysDay
  ) || [];

  const completedTodayActions = todaysActions.filter(a => a.completed).length;
  const totalTodayActions = todaysActions.length;
  const todaysProgress = totalTodayActions > 0 
    ? Math.round((completedTodayActions / totalTodayActions) * 100) 
    : 0;

  // Calculate overall monthly progress
  const calculateMonthlyProgress = () => {
    if (!planData?.monthlyGoals || planData.monthlyGoals.length === 0) return 0;
    const total = planData.monthlyGoals.reduce((sum, goal) => sum + goal.progress, 0);
    return Math.round(total / planData.monthlyGoals.length);
  };

  if (!planData || !currentWeek) {
    return (
      <Card className="p-6 bg-gradient-to-br from-teal-50 to-white border-teal-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Create Your Plan</h3>
            <p className="text-sm text-slate-600">Map out {childName}'s development journey</p>
          </div>
        </div>
        <Button 
          onClick={onNavigateToPlan}
          className="w-full bg-teal-500 hover:bg-teal-600"
        >
          Get Started <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-l-4 border-l-teal-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-teal-500" />
          <h3 className="font-semibold text-slate-900">This Week's Focus</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateToPlan}
          className="gap-1"
        >
          View Plan
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Current Week Focus */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
        <div className="flex items-start gap-2 mb-2">
          <Target className="w-4 h-4 text-teal-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-slate-900 text-sm">{currentWeek.title}</h4>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={currentWeek.progress} className="h-1.5 flex-1" />
              <span className="text-xs font-medium text-teal-600">{currentWeek.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Actions */}
      {todaysActions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Today's Actions:</h4>
          <div className="space-y-2">
            {todaysActions.slice(0, 2).map((action) => (
              <div
                key={action.id}
                className={`flex items-center gap-2 p-2 rounded-md ${
                  action.completed ? 'bg-teal-50' : 'bg-white border border-slate-200'
                }`}
              >
                {action.completed ? (
                  <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className={`text-sm ${
                  action.completed ? 'text-teal-900 line-through' : 'text-slate-700'
                }`}>
                  {action.action}
                </span>
              </div>
            ))}
            {todaysActions.length > 2 && (
              <button
                onClick={onNavigateToPlan}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                +{todaysActions.length - 2} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* Vision Reminder */}
      {planData.vision && planData.vision.length > 0 && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-purple-900 mb-1">Remember:</p>
              <p className="text-xs text-purple-800 leading-relaxed">
                {planData.vision[0].bigPicture}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Progress Summary */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Monthly progress</span>
          <span className="font-semibold text-teal-600">{calculateMonthlyProgress()}%</span>
        </div>
      </div>
    </Card>
  );
}
