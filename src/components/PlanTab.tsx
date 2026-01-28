import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  ClipboardList,
  Target,
  Clock,
  BookOpen,
  TrendingUp,
  Gift,
  Lightbulb,
  Library,
  Share,
  CheckCircle,
  Circle,
  MessageSquare,
  Users2,
  Brain,
  Calendar,
  Timer,
  Star,
  Award,
  BarChart3,
  Heart,
  Play,
  Pause,
  RotateCcw,
  Plus,
  ChevronRight,
  FileText,
  Download,
  Send,
  Settings,
  Eye,
  Sparkles,
  Video,
  Gamepad2,
  PuzzleIcon as Puzzle,
  Palette,
  Zap,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Copy,
  ExternalLink,
  Mail
} from 'lucide-react';
import { useDisplayNames } from '../lib/name-store';

interface PlanTabProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string | null;
  connectorData?: any;
  publishEvent?: (eventName: string, payload: any) => void;
  onConnectorNavigation?: (destination: string) => void;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'speech' | 'social' | 'sensory' | 'routines';
  timeline: 'short' | 'medium' | 'long';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
    dueDate?: Date;
  }>;
}

interface Routine {
  id: string;
  title: string;
  description: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  duration: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    order: number;
  }>;
  frequency: string;
  active: boolean;
}

interface Strategy {
  id: string;
  title: string;
  description: string;
  category: 'teaching' | 'regulation' | 'communication' | 'sensory';
  whenToUse: string;
  howToImplement: string;
  tips: string[];
  effectiveness: number;
}

export function PlanTab({ userData, userTier, connectorData, publishEvent, onConnectorNavigation }: PlanTabProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  const [activeSection, setActiveSection] = useState('overview');

  // Sample data - in real app this would come from connectorData
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Express basic needs verbally',
      description: 'Use 2-word phrases to request food, toys, or help',
      category: 'speech',
      timeline: 'short',
      priority: 'high',
      progress: 75,
      milestones: [
        { id: '1-1', title: 'Say "want" + object name', completed: true },
        { id: '1-2', title: 'Request help with "help me"', completed: true },
        { id: '1-3', title: 'Use please and thank you', completed: false, dueDate: new Date('2025-10-01') }
      ]
    },
    {
      id: '2',
      title: 'Play cooperatively with peers',
      description: 'Engage in turn-taking games for 5+ minutes',
      category: 'social',
      timeline: 'medium',
      priority: 'high',
      progress: 45,
      milestones: [
        { id: '2-1', title: 'Take turns with toys', completed: true },
        { id: '2-2', title: 'Share materials willingly', completed: false },
        { id: '2-3', title: 'Initiate play with others', completed: false }
      ]
    },
    {
      id: '3',
      title: 'Self-regulate during transitions',
      description: 'Use calming strategies when changing activities',
      category: 'sensory',
      timeline: 'medium',
      priority: 'medium',
      progress: 30,
      milestones: [
        { id: '3-1', title: 'Identify when feeling overwhelmed', completed: false },
        { id: '3-2', title: 'Use deep breathing technique', completed: true },
        { id: '3-3', title: 'Request break when needed', completed: false }
      ]
    }
  ]);

  const [routines, setRoutines] = useState<Routine[]>([
    {
      id: '1',
      title: 'Morning Wake-Up Routine',
      description: 'Structured morning sequence to start the day calmly',
      timeOfDay: 'morning',
      duration: '20 minutes',
      frequency: 'Daily',
      active: true,
      steps: [
        { id: '1-1', title: 'Wake up gently', description: 'Use soft music or natural light', order: 1 },
        { id: '1-2', title: 'Stretch and move', description: '5 simple stretches in bed', order: 2 },
        { id: '1-3', title: 'Get dressed', description: 'Choose from 2 pre-selected outfits', order: 3 },
        { id: '1-4', title: 'Breakfast together', description: 'Sit at table and eat mindfully', order: 4 }
      ]
    },
    {
      id: '2',
      title: 'Bedtime Wind-Down',
      description: 'Calming routine to prepare for sleep',
      timeOfDay: 'bedtime',
      duration: '30 minutes',
      frequency: 'Daily',
      active: true,
      steps: [
        { id: '2-1', title: 'Dim the lights', description: 'Create a calm environment', order: 1 },
        { id: '2-2', title: 'Bath or wash face', description: 'Gentle sensory input', order: 2 },
        { id: '2-3', title: 'Read together', description: 'Choose a favorite story', order: 3 },
        { id: '2-4', title: 'Practice gratitude', description: 'Share 3 good things from the day', order: 4 }
      ]
    }
  ]);

  const [strategies, setStrategies] = useState<Strategy[]>([
    {
      id: '1',
      title: 'Visual Schedule Support',
      description: 'Use pictures to show daily activities and transitions',
      category: 'teaching',
      whenToUse: 'During transitions or when introducing new activities',
      howToImplement: 'Create picture cards showing each step of an activity or routine',
      effectiveness: 85,
      tips: [
        'Use real photos of your child doing the activities',
        'Keep schedules simple with 3-5 steps maximum',
        'Let your child move completed steps to a "done" box'
      ]
    },
    {
      id: '2',
      title: 'First-Then Technique',
      description: 'Present choices in a "first this, then that" format',
      category: 'regulation',
      whenToUse: 'When your child resists activities or wants immediate gratification',
      howToImplement: 'Show two pictures: "First brush teeth, then play games"',
      effectiveness: 78,
      tips: [
        'Always follow through on the "then" part',
        'Start with easy "first" tasks to build success',
        'Use preferred activities as the "then" motivator'
      ]
    },
    {
      id: '3',
      title: 'Communication Temptations',
      description: 'Create opportunities that naturally encourage communication',
      category: 'communication',
      whenToUse: 'Throughout daily routines and play time',
      howToImplement: 'Put favorite items in sight but out of reach, pause during songs',
      effectiveness: 72,
      tips: [
        'Wait expectantly for communication attempts',
        'Accept any form of communication (gestures, sounds, words)',
        'Model the words you want to hear'
      ]
    }
  ]);

  const getTimeOfDayIcon = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'morning': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'afternoon': return <Clock className="w-4 h-4 text-orange-400" />;
      case 'evening': return <Clock className="w-4 h-4 text-indigo-500" />;
      case 'bedtime': return <Clock className="w-4 h-4 text-purple-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'speech': return <MessageSquare className="w-4 h-4" />;
      case 'social': return <Users2 className="w-4 h-4" />;
      case 'sensory': return <Brain className="w-4 h-4" />;
      case 'routines': return <Clock className="w-4 h-4" />;
      case 'teaching': return <BookOpen className="w-4 h-4" />;
      case 'regulation': return <Heart className="w-4 h-4" />;
      case 'communication': return <MessageSquare className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'speech': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800';
      case 'social': return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800';
      case 'sensory': return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-800';
      case 'routines': return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800';
      case 'teaching': return 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-800';
      case 'regulation': return 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-800';
      case 'communication': return 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-900/30 dark:border-cyan-800';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/30 dark:border-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTimelineLabel = (timeline: string) => {
    switch (timeline) {
      case 'short': return '2-4 weeks';
      case 'medium': return '1-3 months';
      case 'long': return '3-6 months';
      default: return 'Ongoing';
    }
  };

  const sections = [
    { id: 'overview', title: 'Overview', icon: Eye, description: 'Plan summary and recent progress' },
    { id: 'goals', title: 'Goals', icon: Target, description: 'Development goals and milestones' },
    { id: 'routines', title: 'Routines', icon: Clock, description: 'Daily routines and schedules' },
    { id: 'strategies', title: 'Strategies', icon: Lightbulb, description: 'Techniques and interventions' },
    { id: 'tracking', title: 'Data & Tracking', icon: TrendingUp, description: 'Progress monitoring tools' },
    { id: 'rewards', title: 'Rewards', icon: Gift, description: 'Motivation and celebration ideas' },
    { id: 'insights', title: 'Insights', icon: BarChart3, description: 'Data analysis and patterns' },
    { id: 'library', title: 'Library', icon: Library, description: 'Resources and activities' },
    { id: 'sharing', title: 'Sharing', icon: Share, description: 'Export and share your plan' }
  ];

  const renderOverview = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Plan Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl text-slate-900 dark:text-slate-100 mb-2">{childShort}'s Development Plan</h2>
        <p className="text-slate-600 dark:text-slate-400">Personalized support for {childShort}'s unique journey</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200">
            Active Plan
          </Badge>
          <Badge variant="outline" className="text-slate-600">
            Updated Today
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 text-center">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100">{goals.length}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Active Goals</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100">
            {goals.reduce((acc, goal) => acc + goal.milestones.filter(m => m.completed).length, 0)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Completed Milestones</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100">{routines.filter(r => r.active).length}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Daily Routines</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Lightbulb className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100">{strategies.length}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Strategies</div>
        </Card>
      </div>

      {/* Recent Progress */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Recent Progress</h3>
        <div className="space-y-3 sm:space-y-4">
          {goals.slice(0, 2).map((goal) => (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getCategoryColor(goal.category)}>
                    {getCategoryIcon(goal.category)}
                    <span className="ml-1 capitalize">{goal.category}</span>
                  </Badge>
                  <span className="text-sm text-slate-900 dark:text-slate-100">{goal.title}</span>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>
          ))}
        </div>
      </Card>

      {/* Next Steps Recommendations */}
      <Card className="p-6 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 border-teal-200 dark:border-teal-800">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">Recommended Next Steps</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300">Consider adding an afternoon routine to support {childShort}'s transitions</p>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300">Schedule a progress review with your Aminy Junior coach this week</p>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300">Explore new sensory activities in the Library section</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Review
              </Button>
              <Button size="sm" variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50" onClick={() => setActiveSection('library')}>
                <Library className="w-4 h-4 mr-2" />
                Browse Library
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-slate-900 dark:text-slate-100">Development Goals</h2>
          <p className="text-slate-600 dark:text-slate-400">Track progress toward key milestones</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {goals.map((goal) => (
          <Card key={goal.id} className="p-4 sm:p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={getCategoryColor(goal.category)}>
                    {getCategoryIcon(goal.category)}
                    <span className="ml-1 capitalize">{goal.category}</span>
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(goal.priority)}>
                    {goal.priority} priority
                  </Badge>
                  <Badge variant="outline" className="text-slate-600">
                    {getTimelineLabel(goal.timeline)}
                  </Badge>
                </div>
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{goal.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{goal.description}</p>
                
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
                      <span className="text-sm text-slate-900 dark:text-slate-100">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm text-slate-900 dark:text-slate-100">Milestones:</h4>
                  {goal.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-2">
                      {milestone.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400" />
                      )}
                      <span className={`text-sm ${milestone.completed ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                        {milestone.title}
                      </span>
                      {milestone.dueDate && !milestone.completed && (
                        <Badge variant="outline" className="text-xs">
                          Due {milestone.dueDate.toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderRoutines = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-slate-900 dark:text-slate-100">Daily Routines</h2>
          <p className="text-slate-600 dark:text-slate-400">Structure and predictability for better outcomes</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Routine
        </Button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {routines.map((routine) => (
          <Card key={routine.id} className="p-4 sm:p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getTimeOfDayIcon(routine.timeOfDay)}
                  <Badge variant="outline" className="capitalize">
                    {routine.timeOfDay}
                  </Badge>
                  <Badge variant="outline">
                    {routine.duration}
                  </Badge>
                  <Badge variant="outline">
                    {routine.frequency}
                  </Badge>
                  {routine.active && (
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{routine.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{routine.description}</p>

                <div className="space-y-2">
                  <h4 className="text-sm text-slate-900 dark:text-slate-100">Steps:</h4>
                  {routine.steps.map((step) => (
                    <div key={step.id} className="flex items-start gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-teal-700">{step.order}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900 dark:text-slate-100 mb-1">{step.title}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{step.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm">
                  {routine.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStrategies = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-slate-900 dark:text-slate-100">Strategies & Techniques</h2>
          <p className="text-slate-600 dark:text-slate-400">Evidence-based approaches for daily challenges</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Strategy
        </Button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {strategies.map((strategy) => (
          <Card key={strategy.id} className="p-4 sm:p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={getCategoryColor(strategy.category)}>
                    {getCategoryIcon(strategy.category)}
                    <span className="ml-1 capitalize">{strategy.category}</span>
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{strategy.effectiveness}% effective</span>
                  </div>
                </div>
                
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{strategy.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{strategy.description}</p>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-1">When to use:</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{strategy.whenToUse}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-1">How to implement:</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{strategy.howToImplement}</p>
                  </div>

                  <div>
                    <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-2">Tips for success:</h4>
                    <ul className="space-y-1">
                      {strategy.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-2 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm">
                  <BookOpen className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTracking = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Data & Tracking</h2>
        <p className="text-slate-600 dark:text-slate-400">Monitor progress with data-driven insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Progress Tracking</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Daily Goals Met</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">85%</span>
            </div>
            <Progress value={85} className="h-2" />
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Weekly Consistency</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">78%</span>
            </div>
            <Progress value={78} className="h-2" />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Data Collection</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Plus className="w-4 h-4 mr-2" />
              Log Daily Observation
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Timer className="w-4 h-4 mr-2" />
              Start Activity Timer
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Quick Data Entry</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="outline" size="sm">😊 Great Day</Button>
          <Button variant="outline" size="sm">🎯 Goal Met</Button>
          <Button variant="outline" size="sm">😤 Challenging</Button>
          <Button variant="outline" size="sm">🔄 Needs Practice</Button>
        </div>
      </Card>
    </div>
  );

  const renderRewards = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Motivation & Rewards</h2>
        <p className="text-slate-600 dark:text-slate-400">Celebrate progress and maintain motivation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Current Motivators</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Gift className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Screen time</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">15 minutes after completing morning routine</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Star className="w-5 h-5 text-amber-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Sticker chart</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">One sticker for each completed milestone</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Heart className="w-5 h-5 text-rose-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Special time</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">One-on-one play time with parent</div>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Motivator
          </Button>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Celebration Ideas</h3>
          <div className="space-y-3">
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-300">Milestone Celebration</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">Dance party when {childShort} completes a major milestone</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-300">Weekly Reward</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400">Special outing to favorite playground for consistent daily progress</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-800 dark:text-purple-300">Creative Celebration</span>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-400">Art project together when reaching monthly goals</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Progress Rewards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-sm text-slate-900 dark:text-slate-100 mb-1">Bronze Level</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">5 completed goals</div>
            <Progress value={60} className="h-1 mt-2" />
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-sm text-slate-900 dark:text-slate-100 mb-1">Silver Level</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">10 completed goals</div>
            <Progress value={30} className="h-1 mt-2" />
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-sm text-slate-900 dark:text-slate-100 mb-1">Gold Level</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">20 completed goals</div>
            <Progress value={15} className="h-1 mt-2" />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Insights & Analytics</h2>
        <p className="text-slate-600 dark:text-slate-400">Data-driven patterns and recommendations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Progress Trends</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-slate-900 dark:text-slate-100">Communication</span>
              </div>
              <span className="text-sm text-green-600">+15% this week</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-slate-900 dark:text-slate-100">Social Skills</span>
              </div>
              <span className="text-sm text-green-600">+8% this week</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-slate-900 dark:text-slate-100">Sensory Regulation</span>
              </div>
              <span className="text-sm text-amber-600">-3% this week</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Time Insights</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Best performance time</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Morning sessions (9-11 AM)</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Challenging period</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Late afternoon (4-6 PM)</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Average session length</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">25 minutes</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Aminy Junior AI Insights</h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm text-blue-900 dark:text-blue-300 mb-1">Pattern Recognition</h4>
                <p className="text-sm text-blue-800 dark:text-blue-400">{childShort} shows stronger engagement with visual supports during transition times. Consider adding picture schedules to afternoon routines.</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm text-emerald-900 dark:text-emerald-300 mb-1">Optimization Suggestion</h4>
                <p className="text-sm text-emerald-800 dark:text-emerald-400">Your current reward system is highly effective. Consider expanding the sticker chart to include peer interaction goals.</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm text-purple-900 dark:text-purple-300 mb-1">Goal Recommendation</h4>
                <p className="text-sm text-purple-800 dark:text-purple-400">Based on current progress, {childShort} may be ready for a new communication goal focusing on requesting help from peers.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderLibrary = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Resource Library</h2>
        <p className="text-slate-600 dark:text-slate-400">Activities, tools, and educational content</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 md:p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Video className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg text-slate-900 dark:text-slate-100 text-center mb-2">Video Tutorials</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">Step-by-step demonstrations of techniques and activities</p>
          <div className="space-y-2">
            <div className="text-sm text-slate-900 dark:text-slate-100">• Visual schedule creation</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">• Communication temptations</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">• Sensory regulation techniques</div>
          </div>
          <Button variant="outline" className="w-full mt-4">Browse Videos</Button>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg text-slate-900 dark:text-slate-100 text-center mb-2">Interactive Activities</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">Engaging games and exercises for skill development</p>
          <div className="space-y-2">
            <div className="text-sm text-slate-900 dark:text-slate-100">• Turn-taking games</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">• Communication builders</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">• Social story creators</div>
          </div>
          <Button variant="outline" className="w-full mt-4">Explore Activities</Button>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg text-slate-900 dark:text-slate-100 text-center mb-2">Printable Resources</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">Downloadable tools and templates for home use</p>
          <div className="space-y-2">
            <div className="text-sm text-slate-900 dark:text-slate-100">• Visual schedule templates</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">• Progress tracking sheets</div>
            <div className="text-sm text-slate-900 dark:text-slate-100">• Reward charts</div>
          </div>
          <Button variant="outline" className="w-full mt-4">Download Resources</Button>
        </Card>
      </div>

      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Recommended for {childShort}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Puzzle className="w-8 h-8 text-indigo-500 flex-shrink-0" />
            <div>
              <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-1">Sensory Break Activities</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Calming exercises for regulation support</p>
              <Button size="sm" variant="outline">View Activity</Button>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <MessageSquare className="w-8 h-8 text-cyan-500 flex-shrink-0" />
            <div>
              <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-1">Communication Board Builder</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Create custom communication tools</p>
              <Button size="sm" variant="outline">Start Building</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Learning Modules</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Understanding Sensory Processing</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">15 min • Beginner friendly</div>
              </div>
            </div>
            <Button size="sm">Start Module</Button>
          </div>
          <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Users2 className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Building Social Skills at Home</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">20 min • Practical tips</div>
              </div>
            </div>
            <Button size="sm">Start Module</Button>
          </div>
          <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-rose-500" />
              <div>
                <div className="text-sm text-slate-900 dark:text-slate-100">Positive Behavior Support Strategies</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">25 min • Evidence-based</div>
              </div>
            </div>
            <Button size="sm">Start Module</Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSharing = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Share & Export</h2>
        <p className="text-slate-600 dark:text-slate-400">Share your plan with team members and export data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Export Options</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Download Progress Data (CSV)
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Copy className="w-4 h-4 mr-2" />
              Generate Summary Link
            </Button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-blue-800 dark:text-blue-300 mb-1">💡 Pro Tip</div>
            <div className="text-xs text-blue-700 dark:text-blue-400">PDF reports are great for sharing with teachers, therapists, or pediatricians</div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Team Sharing</h3>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-sm text-slate-900 dark:text-slate-100 mb-2 block">Share with team members:</label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <Button size="sm">
                  <Send className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-slate-900 dark:text-slate-100 mb-2 block">Current team members:</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-xs text-teal-700">{caregiverShort.charAt(0)}</span>
                    </div>
                    <span className="text-sm text-slate-900 dark:text-slate-100">{caregiverShort} (You)</span>
                  </div>
                  <Badge variant="secondary">Admin</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users2 className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-900 dark:text-slate-100">School Teacher</span>
                  </div>
                  <Badge variant="outline">Viewer</Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Quick Share</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <Mail className="w-6 h-6 mb-2 text-blue-500" />
            <span className="text-sm">Email Report</span>
          </Button>
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <ExternalLink className="w-6 h-6 mb-2 text-green-500" />
            <span className="text-sm">Share Link</span>
          </Button>
          <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
            <FileText className="w-6 h-6 mb-2 text-purple-500" />
            <span className="text-sm">Print Version</span>
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">Privacy & Sharing Settings</h3>
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
              Your child's data is always protected. Team members can only see what you choose to share.
            </p>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              Manage Privacy Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'goals': return renderGoals();
      case 'routines': return renderRoutines();
      case 'strategies': return renderStrategies();
      case 'tracking': return renderTracking();
      case 'rewards': return renderRewards();
      case 'insights': return renderInsights();
      case 'library': return renderLibrary();
      case 'sharing': return renderSharing();
      default: return renderOverview();
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg text-slate-900 dark:text-slate-100">Development Plan</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Comprehensive planning tools</p>
        </div>
        
        <nav className="p-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  isActive 
                    ? 'bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{section.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{section.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-5 md:p-6">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}