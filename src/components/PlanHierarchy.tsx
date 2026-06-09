// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useDisplayNames } from '../lib/name-store';
import {
  ChevronDown,
  ChevronRight,
  Target,
  Calendar,
  CalendarDays,
  CheckCircle,
  Circle,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Brain,
  Eye,
  MessageCircle,
  Plus,
  Clock,
  Star,
  Zap,
  Award,
  ArrowRight,
  Edit,
  Copy,
  MoreHorizontal
} from 'lucide-react';

interface PlanHierarchyProps {
  childName: string;
  parentName: string;
  userTier?: string;
  onPlanUpdate?: (planData: PlanData) => void;
}

interface Vision {
  id: string;
  title: string;
  description: string;
  timeframe: string;
  bigPicture: string;
}

interface MonthlyGoal {
  id: string;
  title: string;
  description: string;
  progress: number;
  visionId: string;
  targetDate: string;
  weeklyGoals: string[];
}

interface WeeklyFocus {
  id: string;
  title: string;
  description: string;
  monthGoalId: string;
  weekOf: string;
  dailyActions: DailyAction[];
  completed: boolean;
  progress: number;
}

interface DailyAction {
  id: string;
  action: string;
  completed: boolean;
  day: string;
}

interface AIRecommendation {
  id: string;
  type: 'shift_focus' | 'new_goal' | 'adjust_approach';
  title: string;
  reason: string;
  suggestion: string;
  confidence: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface PlanData {
  vision: Vision[];
  monthlyGoals: MonthlyGoal[];
  weeklyFocus: WeeklyFocus[];
}

export function PlanHierarchy({ 
  childName, 
  parentName, 
  userTier = 'starter',
  onPlanUpdate 
}: PlanHierarchyProps) {
  const { childShort } = useDisplayNames();
  const safeChildName = childName || childShort || 'Child';
  
  const [visionOpen, setVisionOpen] = useState(true);
  const [monthOpen, setMonthOpen] = useState(true);
  const [weekOpen, setWeekOpen] = useState(true);
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);
  
  // Sample data - in real app, this would come from backend/context
  const [vision, setVision] = useState<Vision>({
    id: 'v1',
    title: `Help ${safeChildName} build independence and confidence`,
    description: 'Focus on communication, daily routines, and social connections',
    timeframe: '6-12 months',
    bigPicture: `${safeChildName} will communicate needs clearly, handle daily routines with minimal support, and engage comfortably with peers.`
  });

  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoal[]>([
    {
      id: 'm1',
      title: 'Independent Morning Routine',
      description: 'Complete getting dressed and breakfast with visual supports',
      progress: 65,
      visionId: 'v1',
      targetDate: 'End of November',
      weeklyGoals: ['w1', 'w2', 'w3']
    },
    {
      id: 'm2',
      title: 'Express Feelings Appropriately',
      description: 'Use feeling words instead of physical reactions when upset',
      progress: 40,
      visionId: 'v1',
      targetDate: 'Mid-December',
      weeklyGoals: ['w4']
    }
  ]);

  const [weeklyFocus, setWeeklyFocus] = useState<WeeklyFocus[]>([
    {
      id: 'w1',
      title: 'Choosing clothes independently',
      description: 'Practice selecting outfit from 2-3 pre-selected options',
      monthGoalId: 'm1',
      weekOf: 'Oct 27 - Nov 2',
      completed: true,
      progress: 100,
      dailyActions: [
        { id: 'd1', action: 'Morning practice with choice board', completed: true, day: 'Mon' },
        { id: 'd2', action: 'Pick between 2 shirts', completed: true, day: 'Tue' },
        { id: 'd3', action: 'Full outfit selection', completed: true, day: 'Wed' },
        { id: 'd4', action: 'Practice with timer', completed: true, day: 'Thu' },
        { id: 'd5', action: 'Independent try (minimal prompts)', completed: true, day: 'Fri' }
      ]
    },
    {
      id: 'w2',
      title: 'Putting on clothes in correct order',
      description: 'Follow visual sequence card for dressing',
      monthGoalId: 'm1',
      weekOf: 'Nov 3 - Nov 9',
      completed: false,
      progress: 80,
      dailyActions: [
        { id: 'd6', action: 'Review sequence card together', completed: true, day: 'Mon' },
        { id: 'd7', action: 'Practice with verbal prompts', completed: true, day: 'Tue' },
        { id: 'd8', action: 'Use sequence card independently', completed: true, day: 'Wed' },
        { id: 'd9', action: 'Timed practice', completed: true, day: 'Thu' },
        { id: 'd10', action: 'Morning routine with minimal help', completed: false, day: 'Fri' }
      ]
    },
    {
      id: 'w3',
      title: 'Getting dressed within time limit',
      description: 'Complete dressing routine in 10 minutes with timer',
      monthGoalId: 'm1',
      weekOf: 'Nov 10 - Nov 16',
      completed: false,
      progress: 20,
      dailyActions: [
        { id: 'd11', action: 'Introduce visual timer', completed: true, day: 'Mon' },
        { id: 'd12', action: 'Practice with 15-min timer', completed: false, day: 'Tue' },
        { id: 'd13', action: 'Reduce to 12 minutes', completed: false, day: 'Wed' },
        { id: 'd14', action: 'Try 10-minute goal', completed: false, day: 'Thu' },
        { id: 'd15', action: 'Celebrate success!', completed: false, day: 'Fri' }
      ]
    },
    {
      id: 'w4',
      title: 'Naming feelings using feeling chart',
      description: 'Point to or name feelings on visual chart',
      monthGoalId: 'm2',
      weekOf: 'Nov 10 - Nov 16',
      completed: false,
      progress: 30,
      dailyActions: [
        { id: 'd16', action: 'Introduce feeling chart', completed: true, day: 'Mon' },
        { id: 'd17', action: 'Practice during calm moments', completed: true, day: 'Tue' },
        { id: 'd18', action: 'Use during book time', completed: false, day: 'Wed' },
        { id: 'd19', action: 'Prompt during transitions', completed: false, day: 'Thu' },
        { id: 'd20', action: 'Real-time practice', completed: false, day: 'Fri' }
      ]
    }
  ]);

  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([
    {
      id: 'r1',
      type: 'shift_focus',
      title: 'Shift focus to independent dressing?',
      reason: `${safeChildName} has mastered choosing clothes. Time to build on that success.`,
      suggestion: 'Move to "Putting on clothes in correct order" this week',
      confidence: 'high',
      actionable: true
    },
    {
      id: 'r2',
      type: 'adjust_approach',
      title: 'Add visual timer to morning routine',
      reason: 'Visual supports are working well. Timer could help with pacing.',
      suggestion: 'Introduce countdown timer for getting dressed',
      confidence: 'high',
      actionable: true
    },
    {
      id: 'r3',
      type: 'new_goal',
      title: 'Consider adding peer play goal',
      reason: `${safeChildName} is doing well with routines. Social skills could be next focus.`,
      suggestion: 'Add monthly goal: "Initiate play with one peer"',
      confidence: 'medium',
      actionable: true
    }
  ]);

  const handleToggleDailyAction = (weekId: string, actionId: string) => {
    setWeeklyFocus(prev => prev.map(week => {
      if (week.id === weekId) {
        const updatedActions = week.dailyActions.map(action =>
          action.id === actionId ? { ...action, completed: !action.completed } : action
        );
        const completedCount = updatedActions.filter(a => a.completed).length;
        const newProgress = Math.round((completedCount / updatedActions.length) * 100);
        
        return {
          ...week,
          dailyActions: updatedActions,
          progress: newProgress,
          completed: newProgress === 100
        };
      }
      return week;
    }));
    
    toast.success('Progress updated!');
  };

  const handleAcceptRecommendation = (recId: string) => {
    const rec = aiRecommendations.find(r => r.id === recId);
    if (!rec) return;

    if (rec.type === 'shift_focus') {
      toast.success(`Great! Shifting focus to next step.`, {
        description: rec.suggestion
      });
    } else if (rec.type === 'new_goal') {
      toast.success(`New goal added to your plan!`, {
        description: rec.suggestion
      });
    } else {
      toast.success(`Plan updated!`, {
        description: rec.suggestion
      });
    }

    // Remove accepted recommendation
    setAIRecommendations(prev => prev.filter(r => r.id !== recId));
  };

  const handleDismissRecommendation = (recId: string) => {
    setAIRecommendations(prev => prev.filter(r => r.id !== recId));
    toast.info('Recommendation dismissed');
  };

  useEffect(() => {
    if (onPlanUpdate) {
      onPlanUpdate({ vision: [vision], monthlyGoals, weeklyFocus });
    }
  }, [vision, monthlyGoals, weeklyFocus]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-[#F0EDE8] text-[#3A4A57] border-[#E8E4DF]';
      default: return 'bg-[#F0EDE8] text-[#3A4A57] border-[#E8E4DF]';
    }
  };

  const calculateOverallProgress = () => {
    const totalProgress = monthlyGoals.reduce((sum, goal) => sum + goal.progress, 0);
    return Math.round(totalProgress / monthlyGoals.length);
  };

  return (
    <div className="min-h-screen bg-mist pb-20">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1B2733]">Your Plan</h1>
          <p className="text-[#5A6B7A] mt-1">
            {parentName} — here's {safeChildName}'s path forward
          </p>
          
          {/* Overall Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#3A4A57]">Overall Progress</span>
              <span className="text-sm font-semibold text-[#6B9080]">{calculateOverallProgress()}%</span>
            </div>
            <Progress value={calculateOverallProgress()} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* AI Goal Recommender */}
        {aiRecommendations.length > 0 && showAIRecommendations && (
          <Card className="p-5 bg-gradient-to-br from-[#FAF7F2] to-white border-2 border-[#6B9080]/20">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#1B2733] flex items-center gap-2">
                  AI Recommendations
                  <Badge variant="secondary" className="text-xs">
                    {aiRecommendations.length} suggestions
                  </Badge>
                </h3>
                <p className="text-sm text-[#5A6B7A] mt-1">
                  Based on {safeChildName}'s progress, here's what I'm thinking...
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIRecommendations(false)}
              >
                Hide
              </Button>
            </div>

            <div className="space-y-3">
              {aiRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 bg-white rounded-lg border border-[#6B9080]/20"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-[#1B2733]">{rec.title}</h4>
                    </div>
                    <Badge className={getConfidenceColor(rec.confidence)}>
                      {rec.confidence} confidence
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-[#3A4A57] mb-2">{rec.reason}</p>
                  
                  <div className="p-3 bg-[#6B9080]/10 rounded-md mb-3">
                    <p className="text-sm text-[#6B9080]">
                      <strong>Suggestion:</strong> {rec.suggestion}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRecommendation(rec.id)}
                      className="bg-primary hover:bg-primary"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Use This
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismissRecommendation(rec.id)}
                    >
                      Not Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Vision Section */}
        <Collapsible open={visionOpen} onOpenChange={setVisionOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="p-5 flex items-center justify-between hover:bg-[#FAF7F2] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-lg text-[#1B2733]">Vision</h2>
                      <Badge variant="secondary" className="text-xs">
                        {vision.timeframe}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#5A6B7A]">The big picture</p>
                  </div>
                </div>
                {visionOpen ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-5 pb-5">
                <Separator className="mb-4" />
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-[#1B2733] mb-2">{vision.title}</h3>
                    <p className="text-[#3A4A57]">{vision.description}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900 leading-relaxed">
                      <strong>Where we're headed:</strong> {vision.bigPicture}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Adjust Vision
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Monthly Goals Section */}
        <Collapsible open={monthOpen} onOpenChange={setMonthOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="p-5 flex items-center justify-between hover:bg-[#FAF7F2] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-lg text-[#1B2733]">This Month</h2>
                      <Badge variant="secondary" className="text-xs">
                        {monthlyGoals.length} goals
                      </Badge>
                    </div>
                    <p className="text-sm text-[#5A6B7A]">Focused milestones</p>
                  </div>
                </div>
                {monthOpen ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-5 pb-5">
                <Separator className="mb-4" />
                <div className="space-y-3 sm:space-y-4">
                  {monthlyGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="p-4 bg-[#FAF7F2] rounded-lg border border-[#E8E4DF]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-[#1B2733] mb-1">{goal.title}</h3>
                          <p className="text-sm text-[#5A6B7A]">{goal.description}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border-[#C8DDE8]">
                          {goal.targetDate}
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[#3A4A57]">Progress</span>
                          <span className="text-sm font-semibold text-blue-600">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                      </div>

                      <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
                        <Target className="w-4 h-4" />
                        <span>{goal.weeklyGoals.length} weekly focus areas</span>
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="outline" className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Add Monthly Goal
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Weekly Focus Section */}
        <Collapsible open={weekOpen} onOpenChange={setWeekOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="p-5 flex items-center justify-between hover:bg-[#FAF7F2] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#6B9080]/10 rounded-lg flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-[#6B9080]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-lg text-[#1B2733]">This Week</h2>
                      <Badge variant="secondary" className="text-xs">
                        {weeklyFocus.length} focus areas
                      </Badge>
                    </div>
                    <p className="text-sm text-[#5A6B7A]">Daily actions that matter</p>
                  </div>
                </div>
                {weekOpen ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-5 pb-5">
                <Separator className="mb-4" />
                <div className="space-y-3 sm:space-y-4">
                  {weeklyFocus.map((week) => (
                    <div
                      key={week.id}
                      className={`p-4 rounded-lg border-2 ${
                        week.completed
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-[#E8E4DF]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {week.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-400" />
                            )}
                            <h3 className="font-medium text-[#1B2733]">{week.title}</h3>
                          </div>
                          <p className="text-sm text-[#5A6B7A] ml-7">{week.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {week.weekOf}
                        </Badge>
                      </div>

                      <div className="mb-3 ml-7">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[#3A4A57]">Week Progress</span>
                          <span className="text-sm font-semibold text-[#6B9080]">{week.progress}%</span>
                        </div>
                        <Progress value={week.progress} className="h-2" />
                      </div>

                      {/* Daily Actions */}
                      <div className="ml-7 space-y-2">
                        <h4 className="text-sm font-medium text-[#3A4A57] mb-2">Daily Actions:</h4>
                        {week.dailyActions.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleToggleDailyAction(week.id, action.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-md border transition-all ${
                              action.completed
                                ? 'bg-[#6B9080]/10 border-[#6B9080]/20'
                                : 'bg-white border-[#E8E4DF] hover:border-[#6B9080]/30'
                            }`}
                          >
                            {action.completed ? (
                              <CheckCircle className="w-4 h-4 text-[#6B9080] flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 text-left">
                              <span className={`text-sm ${
                                action.completed ? 'text-[#6B9080] line-through' : 'text-[#3A4A57]'
                              }`}>
                                {action.action}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {action.day}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Quick Actions */}
        <Card className="p-3 sm:p-4">
          <h3 className="font-medium text-[#1B2733] mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start gap-2">
              <Copy className="w-4 h-4" />
              Share Plan
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <MessageCircle className="w-4 h-4" />
              Aminy
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
