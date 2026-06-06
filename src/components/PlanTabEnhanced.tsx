import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  Mail,
  AlertTriangle,
  Shield,
  Activity,
  LineChart,
  Camera,
  Flame,
  Users,
  School,
  GraduationCap,
  UserCheck,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  MessageCircle,
  Home,
  Stethoscope,
  PieChart,
  Filter,
  Sliders,
  MonitorSpeaker,
  Monitor,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileType,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb as LightbulbIcon,
  Bookmark,
  Flag
} from 'lucide-react';
import { useDisplayNames } from '../lib/name-store';
import type {
  PlanTabEnhancedProps,
  CaregiverFeedback,
  CoachingTouchpoint,
  RiskSafetyData,
  LongitudinalData,
  FamilyIntegration,
  AIInsightData,
  OutcomeMetrics,
  DailyCoachingTask,
  ParentStreak,
  EnhancedGoal,
  EnhancedRoutine,
} from '../types/care-plan';

export function PlanTabEnhanced({ userData, userTier, connectorData, publishEvent, onConnectorNavigation }: PlanTabEnhancedProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  const [activeSection, setActiveSection] = useState('overview');
  const [showBaseline, setShowBaseline] = useState(true);
  const [selectedExportOptions, setSelectedExportOptions] = useState<string[]>(['goals', 'routines', 'progress']);
  const [streakData, setStreakData] = useState<ParentStreak>({
    currentStreak: 12,
    longestStreak: 18,
    streakType: 'logging',
    lastActivity: new Date()
  });

  // Enhanced sample data with baseline tracking
  const [enhancedGoals, setEnhancedGoals] = useState<EnhancedGoal[]>([
    {
      id: '1',
      title: 'Express basic needs verbally',
      description: 'Use 2-word phrases to request food, toys, or help',
      category: 'speech',
      timeline: 'short',
      priority: 'high',
      progress: 75,
      baselineData: {
        id: 'b1',
        goalId: '1',
        startingLevel: 25,
        startingDate: new Date('2025-08-01'),
        description: 'Used single words occasionally, mostly gestures',
        assessmentMethod: 'Direct observation over 1 week'
      },
      milestones: [
        { id: '1-1', title: 'Say "want" + object name', completed: true, completedDate: new Date('2025-08-15') },
        { id: '1-2', title: 'Request help with "help me"', completed: true, completedDate: new Date('2025-09-01') },
        { id: '1-3', title: 'Use please and thank you', completed: false, dueDate: new Date('2025-10-01') }
      ],
      feedback: [
        {
          id: 'f1',
          goalId: '1',
          date: new Date('2025-09-15'),
          difficulty: 'just_right',
          effectiveness: 4,
          notes: 'Great progress with requesting help!',
          recommendedAdjustment: 'Continue current approach'
        }
      ],
      trends: [25, 35, 45, 55, 65, 75] // Weekly progress
    },
    {
      id: '2',
      title: 'Play cooperatively with peers',
      description: 'Engage in turn-taking games for 5+ minutes',
      category: 'social',
      timeline: 'medium',
      priority: 'high',
      progress: 45,
      baselineData: {
        id: 'b2',
        goalId: '2',
        startingLevel: 10,
        startingDate: new Date('2025-08-01'),
        description: 'Parallel play only, difficulty with turn-taking',
        assessmentMethod: 'Playground observation'
      },
      milestones: [
        { id: '2-1', title: 'Take turns with toys', completed: true, completedDate: new Date('2025-08-20') },
        { id: '2-2', title: 'Share materials willingly', completed: false },
        { id: '2-3', title: 'Initiate play with others', completed: false }
      ],
      feedback: [
        {
          id: 'f2',
          goalId: '2',
          date: new Date('2025-09-10'),
          difficulty: 'too_hard',
          effectiveness: 2,
          notes: 'Struggling with sharing, gets frustrated',
          recommendedAdjustment: 'Break into smaller steps, use timer'
        }
      ],
      trends: [10, 15, 25, 30, 35, 45]
    }
  ]);

  const [enhancedRoutines, setEnhancedRoutines] = useState<EnhancedRoutine[]>([
    {
      id: '1',
      title: 'Morning Wake-Up Routine',
      description: 'Structured morning sequence to start the day calmly',
      timeOfDay: 'morning',
      duration: '20 minutes',
      frequency: 'Daily',
      active: true,
      completionRate: 85,
      steps: [
        { id: '1-1', title: 'Wake up gently', description: 'Use soft music or natural light', order: 1 },
        { id: '1-2', title: 'Stretch and move', description: '5 simple stretches in bed', order: 2 },
        { id: '1-3', title: 'Get dressed', description: 'Choose from 2 pre-selected outfits', order: 3 },
        { id: '1-4', title: 'Breakfast together', description: 'Sit at table and eat mindfully', order: 4 }
      ],
      feedback: [
        {
          id: 'rf1',
          routineId: '1',
          date: new Date('2025-09-15'),
          difficulty: 'just_right',
          effectiveness: 5,
          notes: 'Morning routine going smoothly now',
          recommendedAdjustment: 'Consider adding choice in breakfast'
        }
      ],
      adaptations: ['Visual schedule', 'Choice between 2 outfits', 'Calming music']
    }
  ]);

  // Coaching data (Pro tier only)
  const [coachingData, setCoachingData] = useState<CoachingTouchpoint[]>([
    {
      id: 'c1',
      date: new Date('2025-09-10'),
      coachName: 'Sarah Martinez, RBT',
      sessionType: 'review',
      goalsWorkedOn: ['1', '2'],
      coachNotes: 'Excellent progress on verbal requests. Social skills need more structured practice.',
      parentNotes: 'Noticed improvement in requesting help at home',
      recommendedTweaks: [
        'Increase peer interaction opportunities',
        'Use timer for turn-taking practice',
        'Add social stories about sharing'
      ],
      nextSessionDate: new Date('2025-09-24')
    }
  ]);

  // Risk & Safety data
  const [riskSafetyData, setRiskSafetyData] = useState<RiskSafetyData>({
    triggers: [
      {
        id: 't1',
        description: 'Loud unexpected noises',
        severity: 'medium',
        frequency: '2-3 times per week',
        strategies: ['Noise-canceling headphones', 'Preparation before events', 'Calming corner']
      },
      {
        id: 't2',
        description: 'Transitions between activities',
        severity: 'low',
        frequency: 'Daily',
        strategies: ['5-minute warning', 'Visual timer', 'First-then board']
      }
    ],
    safetyPlans: [
      {
        id: 's1',
        title: 'Sensory Overload Response',
        trigger: 'Signs of overwhelm (covering ears, backing away)',
        steps: [
          'Immediate removal from trigger if possible',
          'Guide to calming corner',
          'Offer noise-reducing headphones',
          'Use deep breathing together',
          'Wait for self-regulation signs'
        ],
        emergencyContacts: ['Mom: (555) 123-4567', 'Dad: (555) 123-4568']
      }
    ],
    crisisNotes: [
      {
        id: 'cr1',
        date: new Date('2025-09-05'),
        description: 'Meltdown at grocery store due to sudden announcement over intercom',
        actionTaken: 'Left store immediately, used calming strategies in car',
        outcome: 'Regulated within 15 minutes, discussed preparation strategies'
      }
    ]
  });

  // Longitudinal tracking data
  const [longitudinalData, setLongitudinalData] = useState<LongitudinalData>({
    monthlyProgress: [
      {
        month: 'August 2025',
        goalsProgress: { '1': 35, '2': 15 },
        routinesCompleted: 75,
        strategiesUsed: 8,
        parentParticipation: 90
      },
      {
        month: 'September 2025',
        goalsProgress: { '1': 75, '2': 45 },
        routinesCompleted: 85,
        strategiesUsed: 12,
        parentParticipation: 95
      }
    ],
    trendData: {
      communication: [25, 35, 50, 65, 75],
      social: [10, 15, 25, 35, 45],
      adaptive: [40, 45, 55, 65, 70],
      overall: [25, 32, 43, 55, 63]
    }
  });

  // AI Insights data
  const [aiInsights, setAiInsights] = useState<AIInsightData>({
    patternRecognition: [
      {
        pattern: 'Better progress on communication goals in morning sessions',
        confidence: 87,
        recommendation: 'Schedule intensive communication practice during 9-11 AM window'
      },
      {
        pattern: 'Social skills improve when sibling is present',
        confidence: 92,
        recommendation: 'Include structured sibling interaction in social goals'
      }
    ],
    optimizationSuggestions: [
      {
        area: 'Routine completion',
        suggestion: 'Reduce morning routine from 4 to 3 steps initially',
        expectedImpact: 25
      },
      {
        area: 'Goal difficulty',
        suggestion: 'Add intermediate milestone for sharing goal',
        expectedImpact: 40
      }
    ],
    riskAlerts: [
      {
        type: 'Goal stagnation',
        severity: 'medium',
        description: 'Social goal progress has slowed in past 2 weeks',
        action: 'Consider adjusting strategy or breaking into smaller steps'
      }
    ],
    motivationChecks: [
      {
        area: 'Speech goals',
        trend: 'increasing',
        recommendation: 'Continue current motivators (stickers, praise)'
      },
      {
        area: 'Social goals',
        trend: 'decreasing',
        recommendation: 'Refresh reinforcers, consider peer buddy system'
      }
    ]
  });

  // Daily coaching tasks
  const [dailyTasks, setDailyTasks] = useState<DailyCoachingTask[]>([
    {
      id: 'dt1',
      title: 'Practice "help me" phrase',
      description: 'Create 3 opportunities for child to request help during morning routine',
      goalId: '1',
      estimatedTime: '5 minutes',
      completed: true,
      feedback: 'Great success - asked for help with buttons!'
    },
    {
      id: 'dt2',
      title: 'Sibling turn-taking',
      description: 'Set up 10-minute turn-taking activity with sibling using timer',
      goalId: '2',
      estimatedTime: '10 minutes',
      completed: false
    }
  ]);

  // Family & School integration data
  const [familyIntegration, setFamilyIntegration] = useState<FamilyIntegration>({
    teacherReports: [
      {
        id: 'tr1',
        date: new Date('2025-09-15'),
        teacherName: 'Ms. Johnson',
        observations: 'Improved verbal communication in class. Still needs support with peer interactions during free play.',
        recommendations: 'Continue speech goals, add structured peer activities',
        goals: ['1', '2']
      }
    ],
    siblingTracking: [
      {
        id: 'st1',
        name: 'Alex (older sibling)',
        activities: ['Turn-taking games', 'Reading together', 'Helping with routines'],
        consistency: 85
      }
    ]
  });

  // Outcome metrics for payers/acquirers
  const [outcomeMetrics, setOutcomeMetrics] = useState<OutcomeMetrics>({
    goalsPercentageMastered: 67,
    routinesCompletionRate: 85,
    caregiverParticipationRate: 95,
    monthlyProgressRate: 32,
    costEffectiveness: 78,
    roi: 125
  });

  const sections = [
    { id: 'overview', title: 'Overview', icon: Eye, description: 'Plan summary and progress dashboard' },
    { id: 'goals', title: 'Goals', icon: Target, description: 'Development goals with baseline tracking' },
    { id: 'routines', title: 'Routines', icon: Clock, description: 'Daily routines with feedback' },
    { id: 'strategies', title: 'Strategies', icon: Lightbulb, description: 'Evidence-based techniques' },
    { id: 'tracking', title: 'Data & Tracking', icon: TrendingUp, description: 'Progress monitoring and trends' },
    { id: 'coaching', title: 'Coaching', icon: UserCheck, description: 'Coach reviews and guidance', tier: 'pro' },
    { id: 'safety', title: 'Safety & Risk', icon: Shield, description: 'Triggers, safety plans, crisis notes' },
    { id: 'insights', title: 'AI Insights', icon: Brain, description: 'Pattern recognition and optimization' },
    { id: 'family', title: 'Family & School', icon: Users, description: 'Teacher reports and family tracking' },
    { id: 'outcomes', title: 'Outcome Metrics', icon: PieChart, description: 'ROI and effectiveness data' },
    { id: 'rewards', title: 'Rewards', icon: Gift, description: 'Motivation and celebration ideas' },
    { id: 'library', title: 'Library', icon: Library, description: 'Resources and activities' },
    { id: 'sharing', title: 'Sharing', icon: Share, description: 'Export and share your plan' }
  ];

  // Helper functions
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'speech': return <MessageSquare className="w-4 h-4" />;
      case 'social': return <Users2 className="w-4 h-4" />;
      case 'sensory': return <Brain className="w-4 h-4" />;
      case 'routines': return <Clock className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'speech': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800';
      case 'social': return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800';
      case 'sensory': return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-800';
      case 'routines': return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800';
      default: return 'text-gray-600 bg-[#FAF7F2] border-gray-200 dark:text-gray-400 dark:bg-gray-900/30 dark:border-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-[#FAF7F2] border-gray-200';
    }
  };

  const renderOverview = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Enhanced Plan Header with Progress Portfolio */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl text-slate-900 dark:text-slate-100 mb-2">{childShort}'s Development Plan</h2>
        <p className="text-slate-600 dark:text-slate-400">Personalized support for {childShort}'s unique journey</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Badge variant="secondary" className="bg-[#6B9080]/10 text-[#6B9080] border-[#6B9080]/20">
            Active Plan
          </Badge>
          <Badge variant="outline" className="text-slate-600">
            Updated Today
          </Badge>
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
            <Flame className="w-3 h-3 mr-1" />
            {streakData.currentStreak} day streak
          </Badge>
        </div>
      </div>

      {/* Progress Portfolio Timeline */}
      <Card className="p-6 bg-gradient-to-r from-[#FAF7F2] to-[#F5F2EC] dark:from-blue-900/20 dark:to-teal-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <LineChart className="w-5 h-5 text-blue-600" />
          Progress Portfolio
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Month 1 (August):</span>
            <span className="text-slate-900 dark:text-slate-100">Started baseline assessments, established routines</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Month 2 (September):</span>
            <span className="text-slate-900 dark:text-slate-100">75% progress on speech goals, social skills emerging</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">This Week:</span>
            <span className="text-green-600 font-medium">Breakthrough in requesting help independently</span>
          </div>
        </div>
      </Card>

      {/* Enhanced Quick Stats with Baseline Comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 text-center">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100">{enhancedGoals.length}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Active Goals</div>
          <div className="text-xs text-green-600 mt-1">+50% from baseline</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100">
            {enhancedGoals.reduce((acc, goal) => acc + goal.milestones.filter(m => m.completed).length, 0)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Milestones Completed</div>
          <div className="text-xs text-blue-600 mt-1">67% mastery rate</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Activity className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100">85%</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Routine Completion</div>
          <div className="text-xs text-green-600 mt-1">+15% this month</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Heart className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100">95%</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Parent Participation</div>
          <div className="text-xs text-green-600 mt-1">Excellent consistency</div>
        </Card>
      </div>

      {/* Daily Coaching Tasks */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Today's Coaching Tasks
          </h3>
          <Badge variant="outline">{dailyTasks.filter(t => t.completed).length}/{dailyTasks.length} completed</Badge>
        </div>
        <div className="space-y-3">
          {dailyTasks.map((task) => (
            <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg ${task.completed ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${task.completed ? 'bg-green-600' : 'bg-slate-300'}`}>
                {task.completed && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${task.completed ? 'text-green-800' : 'text-slate-900'}`}>
                  {task.title}
                </div>
                <div className={`text-xs ${task.completed ? 'text-green-600' : 'text-slate-600'}`}>
                  {task.description} • {task.estimatedTime}
                </div>
                {task.feedback && (
                  <div className="text-xs text-green-700 mt-1 italic">
                    "{task.feedback}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI-Powered Next Steps with Pattern Recognition */}
      <Card className="p-6 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 border-[#6B9080]/20 dark:border-teal-800">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 bg-[#6B9080]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-[#6B9080]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">AI-Powered Insights & Next Steps</h3>
            <div className="space-y-3">
              {aiInsights.patternRecognition.slice(0, 2).map((pattern, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{pattern.pattern}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{pattern.recommendation}</p>
                    <Badge variant="outline" className="text-xs mt-1">{pattern.confidence}% confidence</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="border-[#6B9080]/20 text-[#6B9080] hover:bg-[#6B9080]/10" onClick={() => setActiveSection('insights')}>
                <Brain className="w-4 h-4 mr-2" />
                View All Insights
              </Button>
              <Button size="sm" variant="outline" className="border-[#6B9080]/20 text-[#6B9080] hover:bg-[#6B9080]/10" onClick={() => setActiveSection('coaching')}>
                <UserCheck className="w-4 h-4 mr-2" />
                Schedule Coach Review
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderGoalsWithBaseline = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-slate-900 dark:text-slate-100">Development Goals</h2>
          <p className="text-slate-600 dark:text-slate-400">Track progress from baseline to goal with caregiver feedback</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBaseline(!showBaseline)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {showBaseline ? 'Hide' : 'Show'} Baseline
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {enhancedGoals.map((goal) => (
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
                </div>
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{goal.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{goal.description}</p>
                
                {/* Baseline → Current → Goal progression */}
                {showBaseline && (
                  <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Progress Journey</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-center">
                      <div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Baseline</div>
                        <div className="text-lg font-semibold text-slate-700">{goal.baselineData.startingLevel}%</div>
                        <div className="text-xs text-slate-500">{goal.baselineData.startingDate.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Current</div>
                        <div className="text-lg font-semibold text-[#6B9080]">{goal.progress}%</div>
                        <div className="text-xs text-green-600">+{goal.progress - goal.baselineData.startingLevel}% growth</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Goal</div>
                        <div className="text-lg font-semibold text-slate-700">100%</div>
                        <div className="text-xs text-slate-500">{100 - goal.progress}% remaining</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Assessment method:</div>
                      <div className="text-xs text-slate-700">{goal.baselineData.assessmentMethod}</div>
                    </div>
                  </Card>
                )}

                {/* Progress with trend */}
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-900 dark:text-slate-100">{goal.progress}%</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600">
                            +{goal.trends[goal.trends.length - 1] - goal.trends[goal.trends.length - 2]}% this week
                          </span>
                        </div>
                      </div>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                </div>

                {/* Milestones with completion dates */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm text-slate-900 dark:text-slate-100">Milestones:</h4>
                  {goal.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {milestone.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400" />
                        )}
                        <span className={`text-sm ${milestone.completed ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                          {milestone.title}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {milestone.completed && milestone.completedDate ? (
                          `Completed ${milestone.completedDate.toLocaleDateString()}`
                        ) : milestone.dueDate ? (
                          `Due ${milestone.dueDate.toLocaleDateString()}`
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Caregiver Feedback */}
                {goal.feedback.length > 0 && (
                  <Card className="p-3 bg-slate-50">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Recent Feedback</h4>
                    {goal.feedback.slice(-1).map((feedback) => (
                      <div key={feedback.id} className="space-y-2">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Badge variant="outline" className={
                            feedback.difficulty === 'just_right' ? 'text-green-600 border-green-200 bg-green-50' :
                            feedback.difficulty === 'too_hard' ? 'text-red-600 border-red-200 bg-red-50' :
                            'text-amber-600 border-amber-200 bg-amber-50'
                          }>
                            {feedback.difficulty.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400" />
                            <span className="text-sm">{feedback.effectiveness}/5</span>
                          </div>
                          <span className="text-xs text-slate-500">{feedback.date.toLocaleDateString()}</span>
                        </div>
                        {feedback.notes && (
                          <p className="text-sm text-slate-600 italic">"{feedback.notes}"</p>
                        )}
                        {feedback.recommendedAdjustment && (
                          <p className="text-sm text-[#6B9080]">Recommendation: {feedback.recommendedAdjustment}</p>
                        )}
                      </div>
                    ))}
                  </Card>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" title="Provide feedback">
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Caregiver Feedback Quick Survey */}
      <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber-600" />
          Quick Feedback Survey
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          How are {childShort}'s goals feeling this week? Your feedback helps us adjust the plan.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex-1 border-amber-200 hover:bg-amber-50">
            <ThumbsDown className="w-4 h-4 mr-2 text-red-500" />
            Too Hard
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-amber-200 hover:bg-amber-50">
            <ThumbsUp className="w-4 h-4 mr-2 text-green-500" />
            Just Right
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-amber-200 hover:bg-amber-50">
            <ThumbsUp className="w-4 h-4 mr-2 text-blue-500" />
            Too Easy
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderCoaching = () => {
    if (userTier !== 'pro') {
      return (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl text-slate-900 dark:text-slate-100 mb-2">Coaching Review Log</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Get personalized guidance from certified RBTs with detailed session notes and recommendations.
          </p>
          <Button className="bg-purple-600 hover:bg-purple-700">
            Upgrade to Pro
          </Button>
        </Card>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl text-slate-900 dark:text-slate-100">Coaching Review Log</h2>
            <p className="text-slate-600 dark:text-slate-400">Professional guidance from certified RBTs</p>
          </div>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {coachingData.map((session) => (
            <Card key={session.id} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[#6B9080] border-[#6B9080]/20 bg-[#6B9080]/10">
                      <UserCheck className="w-3 h-3 mr-1" />
                      {session.sessionType}
                    </Badge>
                    <span className="text-sm text-slate-600">{session.date.toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">Session with {session.coachName}</h3>
                  
                  <div className="space-y-3 mt-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Goals Worked On:</h4>
                      <div className="flex gap-2">
                        {session.goalsWorkedOn.map((goalId) => {
                          const goal = enhancedGoals.find(g => g.id === goalId);
                          return goal ? (
                            <Badge key={goalId} variant="outline" className={getCategoryColor(goal.category)}>
                              {goal.title}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Coach Notes:</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{session.coachNotes}</p>
                    </div>

                    {session.parentNotes && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Your Notes:</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{session.parentNotes}"</p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Recommended Tweaks:</h4>
                      <ul className="space-y-1">
                        {session.recommendedTweaks.map((tweak, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                            {tweak}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {session.nextSessionDate && (
                      <div className="flex items-center gap-2 p-3 bg-[#6B9080]/10 rounded-lg">
                        <Calendar className="w-4 h-4 text-[#6B9080]" />
                        <span className="text-sm text-[#6B9080]">
                          Next session: {session.nextSessionDate.toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="sm" title="Add notes">
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Export session">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderSafetyRisk = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Safety & Risk Management</h2>
        <p className="text-slate-600 dark:text-slate-400">Triggers, safety plans, and crisis management</p>
      </div>

      <Tabs defaultValue="triggers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="safety">Safety Plans</TabsTrigger>
          <TabsTrigger value="crisis">Crisis Log</TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="space-y-3 sm:space-y-4">
          {riskSafetyData.triggers.map((trigger) => (
            <Card key={trigger.id} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={
                      trigger.severity === 'high' ? 'text-red-600 border-red-200 bg-red-50' :
                      trigger.severity === 'medium' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                      'text-green-600 border-green-200 bg-green-50'
                    }>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {trigger.severity} severity
                    </Badge>
                    <span className="text-sm text-slate-600">{trigger.frequency}</span>
                  </div>
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">{trigger.description}</h3>
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Management Strategies:</h4>
                    <ul className="space-y-1">
                      {trigger.strategies.map((strategy, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="safety" className="space-y-3 sm:space-y-4">
          {riskSafetyData.safetyPlans.map((plan) => (
            <Card key={plan.id} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    {plan.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <strong>Trigger:</strong> {plan.trigger}
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Response Steps:</h4>
                      <ol className="space-y-1">
                        {plan.steps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs text-green-700">{index + 1}</span>
                            </div>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Emergency Contacts:</h4>
                      <div className="flex gap-2">
                        {plan.emergencyContacts.map((contact, index) => (
                          <Badge key={index} variant="outline" className="text-red-600 border-red-200 bg-red-50">
                            {contact}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="crisis" className="space-y-3 sm:space-y-4">
          {riskSafetyData.crisisNotes.map((note) => (
            <Card key={note.id} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Crisis Event
                    </Badge>
                    <span className="text-sm text-slate-600">{note.date.toLocaleDateString()}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Description:</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{note.description}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Action Taken:</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{note.actionTaken}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Outcome:</h4>
                      <p className="text-sm text-green-600">{note.outcome}</p>
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm">
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderEnhancedInsights = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">AI-Powered Insights</h2>
        <p className="text-slate-600 dark:text-slate-400">Pattern recognition, optimization, and predictive analysis</p>
      </div>

      <Tabs defaultValue="patterns" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="risks">Risk Alerts</TabsTrigger>
          <TabsTrigger value="motivation">Motivation</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-3 sm:space-y-4">
          {aiInsights.patternRecognition.map((pattern, index) => (
            <Card key={index} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                      {pattern.confidence}% confidence
                    </Badge>
                  </div>
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">Pattern Detected</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-3">{pattern.pattern}</p>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">AI Recommendation:</h4>
                    <p className="text-sm text-blue-800">{pattern.recommendation}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-3 sm:space-y-4">
          {aiInsights.optimizationSuggestions.map((suggestion, index) => (
            <Card key={index} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      +{suggestion.expectedImpact}% expected improvement
                    </Badge>
                  </div>
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">{suggestion.area}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-3">{suggestion.suggestion}</p>
                  <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                    <Check className="w-4 h-4 mr-2" />
                    Apply Suggestion
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="risks" className="space-y-3 sm:space-y-4">
          {aiInsights.riskAlerts.map((alert, index) => (
            <Card key={index} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  alert.severity === 'high' ? 'bg-red-100' : 
                  alert.severity === 'medium' ? 'bg-amber-100' : 'bg-yellow-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    alert.severity === 'high' ? 'text-red-600' : 
                    alert.severity === 'medium' ? 'text-amber-600' : 'text-yellow-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={
                      alert.severity === 'high' ? 'text-red-600 border-red-200 bg-red-50' :
                      alert.severity === 'medium' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                      'text-yellow-600 border-yellow-200 bg-yellow-50'
                    }>
                      {alert.severity} priority
                    </Badge>
                  </div>
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">{alert.type}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-3">{alert.description}</p>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-900 mb-1">Recommended Action:</h4>
                    <p className="text-sm text-slate-700">{alert.action}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="motivation" className="space-y-3 sm:space-y-4">
          {aiInsights.motivationChecks.map((check, index) => (
            <Card key={index} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={
                      check.trend === 'increasing' ? 'text-green-600 border-green-200 bg-green-50' :
                      check.trend === 'decreasing' ? 'text-red-600 border-red-200 bg-red-50' :
                      'text-amber-600 border-amber-200 bg-amber-50'
                    }>
                      {check.trend === 'increasing' ? <TrendingUp className="w-3 h-3 mr-1" /> :
                       check.trend === 'decreasing' ? <TrendingDown className="w-3 h-3 mr-1" /> :
                       <Activity className="w-3 h-3 mr-1" />}
                      {check.trend}
                    </Badge>
                  </div>
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">{check.area}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{check.recommendation}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderOutcomeMetrics = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Outcome Metrics</h2>
        <p className="text-slate-600 dark:text-slate-400">ROI and effectiveness data for insurance and care teams</p>
      </div>

      {/* Executive Summary for Payers */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-green-600" />
          Executive Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{outcomeMetrics.goalsPercentageMastered}%</div>
            <div className="text-sm text-slate-600">Goals Mastered</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{outcomeMetrics.routinesCompletionRate}%</div>
            <div className="text-sm text-slate-600">Routine Adherence</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{outcomeMetrics.caregiverParticipationRate}%</div>
            <div className="text-sm text-slate-600">Caregiver Engagement</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">{outcomeMetrics.roi}%</div>
            <div className="text-sm text-slate-600">ROI</div>
          </div>
        </div>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Clinical Outcomes</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Goals Achieved</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">{outcomeMetrics.goalsPercentageMastered}%</span>
            </div>
            <Progress value={outcomeMetrics.goalsPercentageMastered} className="h-2" />
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Progress Rate</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">{outcomeMetrics.monthlyProgressRate}%</span>
            </div>
            <Progress value={outcomeMetrics.monthlyProgressRate} className="h-2" />
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Family Adherence</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">{outcomeMetrics.caregiverParticipationRate}%</span>
            </div>
            <Progress value={outcomeMetrics.caregiverParticipationRate} className="h-2" />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Cost Effectiveness</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Cost per Goal Achieved</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">$127</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Reduction in Crisis Events</span>
              <span className="text-sm text-green-600">-40%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Family Satisfaction</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">4.8/5.0</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">ROI vs Traditional ABA</span>
              <span className="text-sm text-green-600">+{outcomeMetrics.roi}%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Longitudinal Progress Chart */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Progress Over Time</h3>
        <div className="space-y-3 sm:space-y-4">
          {longitudinalData.monthlyProgress.map((month, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{month.month}</span>
                <span className="text-sm text-slate-600">
                  {Math.round(Object.values(month.goalsProgress).reduce((a, b) => a + b, 0) / Object.values(month.goalsProgress).length)}% avg progress
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 text-xs">
                <div>
                  <div className="text-slate-600">Goals</div>
                  <div className="text-slate-900">
                    {Math.round(Object.values(month.goalsProgress).reduce((a, b) => a + b, 0) / Object.values(month.goalsProgress).length)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-600">Routines</div>
                  <div className="text-slate-900">{month.routinesCompleted}%</div>
                </div>
                <div>
                  <div className="text-slate-600">Strategies</div>
                  <div className="text-slate-900">{month.strategiesUsed}</div>
                </div>
                <div>
                  <div className="text-slate-600">Participation</div>
                  <div className="text-slate-900">{month.parentParticipation}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderFamilySchool = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Family & School Integration</h2>
        <p className="text-slate-600 dark:text-slate-400">Teacher reports and whole-family consistency tracking</p>
      </div>

      <Tabs defaultValue="teacher" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teacher">Teacher Reports</TabsTrigger>
          <TabsTrigger value="sibling">Sibling Tracking</TabsTrigger>
          <TabsTrigger value="export">Teacher Pack</TabsTrigger>
        </TabsList>

        <TabsContent value="teacher" className="space-y-3 sm:space-y-4">
          {familyIntegration.teacherReports.map((report) => (
            <Card key={report.id} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                      <School className="w-3 h-3 mr-1" />
                      School Report
                    </Badge>
                    <span className="text-sm text-slate-600">{report.date.toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">Report from {report.teacherName}</h3>
                  
                  <div className="space-y-3 mt-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Observations:</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{report.observations}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Recommendations:</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{report.recommendations}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Related Goals:</h4>
                      <div className="flex gap-2">
                        {report.goals.map((goalId) => {
                          const goal = enhancedGoals.find(g => g.id === goalId);
                          return goal ? (
                            <Badge key={goalId} variant="outline" className={getCategoryColor(goal.category)}>
                              {goal.title}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm">
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sibling" className="space-y-3 sm:space-y-4">
          {familyIntegration.siblingTracking?.map((sibling) => (
            <Card key={sibling.id} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                      <Users className="w-3 h-3 mr-1" />
                      Sibling Helper
                    </Badge>
                  </div>
                  <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">{sibling.name}</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Activities:</h4>
                      <div className="flex flex-wrap gap-2">
                        {sibling.activities.map((activity, index) => (
                          <Badge key={index} variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                            {activity}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Consistency</span>
                        <span className="text-sm text-slate-900 dark:text-slate-100">{sibling.consistency}%</span>
                      </div>
                      <Progress value={sibling.consistency} className="h-2" />
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="export" className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5 md:p-6">
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Teacher Communication Pack
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Generate a comprehensive report for {childShort}'s teachers with goals, strategies, and current progress.
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">What's included:</h4>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Current development goals and progress
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Effective strategies and techniques
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Triggers and safety considerations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Communication preferences and methods
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Home-school consistency recommendations
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Teacher Pack (PDF)
                </Button>
                <Button variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Email to Teacher
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderEnhancedSharing = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Export & Share</h2>
        <p className="text-slate-600 dark:text-slate-400">Customizable exports for different audiences</p>
      </div>

      {/* Export Customization */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          Customize Your Export
        </h3>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Select what to include:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'goals', label: 'Goals & Progress', icon: Target },
                { id: 'routines', label: 'Daily Routines', icon: Clock },
                { id: 'strategies', label: 'Strategies', icon: Lightbulb },
                { id: 'progress', label: 'Progress Charts', icon: BarChart3 },
                { id: 'safety', label: 'Safety Plans', icon: Shield },
                { id: 'coaching', label: 'Coach Notes', icon: UserCheck },
                { id: 'baseline', label: 'Baseline Data', icon: LineChart },
                { id: 'feedback', label: 'Caregiver Feedback', icon: MessageCircle }
              ].map((option) => {
                const IconComponent = option.icon;
                return (
                  <label key={option.id} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedExportOptions.includes(option.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedExportOptions([...selectedExportOptions, option.id]);
                        } else {
                          setSelectedExportOptions(selectedExportOptions.filter(o => o !== option.id));
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    <IconComponent className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Export format:</h4>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <FileType className="w-4 h-4 mr-2" />
                PDF Report
              </Button>
              <Button variant="outline" className="flex-1">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel Data
              </Button>
              <Button variant="outline" className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                Shareable Link
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Pre-built Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-green-600" />
            Medical/Clinical Report
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Comprehensive report for healthcare providers, including baselines, progress data, and outcome metrics.
          </p>
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Generate Clinical Report
          </Button>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <School className="w-5 h-5 text-blue-600" />
            School Communication Pack
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Teacher-friendly summary with goals, strategies, and classroom recommendations.
          </p>
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Generate Teacher Pack
          </Button>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Heart className="w-5 h-5 text-purple-600" />
            Family Progress Album
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Beautiful progress portfolio for sharing with family members and celebrating milestones.
          </p>
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Create Progress Album
          </Button>
        </Card>

        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#6B9080]" />
            Insurance Report
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            ROI and outcome metrics report designed for insurance providers and coverage reviews.
          </p>
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Generate Insurance Report
          </Button>
        </Card>
      </div>

      {/* Sharing Options */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Share className="w-5 h-5 text-indigo-600" />
          Share with Team
        </h3>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <Button variant="outline" className="flex flex-col items-center gap-2 h-20">
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Email Report</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-2 h-20">
              <ExternalLink className="w-5 h-5 text-green-600" />
              <span className="text-sm">Create Link</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-2 h-20">
              <Copy className="w-5 h-5 text-purple-600" />
              <span className="text-sm">Copy Summary</span>
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Recent shares:</h4>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Teacher Pack sent to Ms. Johnson</span>
                <span className="text-xs">2 days ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Progress report shared with grandparents</span>
                <span className="text-xs">1 week ago</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  // Main navigation function
  const handleSectionChange = (sectionId: string) => {
    // Check tier restrictions
    const section = sections.find(s => s.id === sectionId);
    if (section?.tier === 'pro' && userTier !== 'pro') {
      // Show upgrade prompt or handle tier restriction
      return;
    }
    setActiveSection(sectionId);
  };

  const renderEnhancedRoutines = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-slate-900 dark:text-slate-100">Daily Routines</h2>
          <p className="text-slate-600 dark:text-slate-400">Structure and predictability with adaptive feedback</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Routine
        </Button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {enhancedRoutines.map((routine) => (
          <Card key={routine.id} className="p-4 sm:p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {routine.timeOfDay === 'morning' && <Clock className="w-4 h-4 text-amber-500" />}
                  {routine.timeOfDay === 'afternoon' && <Clock className="w-4 h-4 text-orange-400" />}
                  {routine.timeOfDay === 'evening' && <Clock className="w-4 h-4 text-indigo-500" />}
                  {routine.timeOfDay === 'bedtime' && <Clock className="w-4 h-4 text-purple-500" />}
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
                  <Badge variant="outline" className="text-[#6B9080] border-[#6B9080]/20 bg-[#6B9080]/10">
                    {routine.completionRate}% success
                  </Badge>
                </div>
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{routine.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{routine.description}</p>

                {/* Completion Rate Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Completion Rate</span>
                    <span className="text-sm text-slate-900 dark:text-slate-100">{routine.completionRate}%</span>
                  </div>
                  <Progress value={routine.completionRate} className="h-2" />
                </div>

                {/* Steps with adaptive indicators */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm text-slate-900 dark:text-slate-100">Steps:</h4>
                  {routine.steps.map((step) => (
                    <div key={step.id} className="flex items-start gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="w-6 h-6 bg-[#6B9080]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-[#6B9080]">{step.order}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900 dark:text-slate-100 mb-1">{step.title}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{step.description}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adaptations */}
                {routine.adaptations.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-2">Current Adaptations:</h4>
                    <div className="flex flex-wrap gap-2">
                      {routine.adaptations.map((adaptation, index) => (
                        <Badge key={index} variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                          <Lightbulb className="w-3 h-3 mr-1" />
                          {adaptation}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Caregiver Feedback */}
                {routine.feedback.length > 0 && (
                  <Card className="p-3 bg-slate-50">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Recent Feedback</h4>
                    {routine.feedback.slice(-1).map((feedback) => (
                      <div key={feedback.id} className="space-y-2">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Badge variant="outline" className={
                            feedback.difficulty === 'just_right' ? 'text-green-600 border-green-200 bg-green-50' :
                            feedback.difficulty === 'too_hard' ? 'text-red-600 border-red-200 bg-red-50' :
                            'text-amber-600 border-amber-200 bg-amber-50'
                          }>
                            {feedback.difficulty.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400" />
                            <span className="text-sm">{feedback.effectiveness}/5</span>
                          </div>
                        </div>
                        {feedback.notes && (
                          <p className="text-sm text-slate-600 italic">"{feedback.notes}"</p>
                        )}
                        {feedback.recommendedAdjustment && (
                          <p className="text-sm text-[#6B9080]">Recommendation: {feedback.recommendedAdjustment}</p>
                        )}
                      </div>
                    ))}
                  </Card>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" title="Provide feedback">
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title={routine.active ? "Pause routine" : "Activate routine"}>
                  {routine.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" title="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderEnhancedStrategies = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-slate-900 dark:text-slate-100">Strategies & Techniques</h2>
          <p className="text-slate-600 dark:text-slate-400">Evidence-based approaches with effectiveness tracking</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Strategy
        </Button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {[
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
            ],
            usageCount: 28,
            lastUsed: new Date('2025-09-15'),
            parentRating: 4.5,
            adaptations: ['Added timer visual', 'Using child photos', 'Simplified to 3 steps']
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
            ],
            usageCount: 15,
            lastUsed: new Date('2025-09-14'),
            parentRating: 4.2,
            adaptations: ['Using visual timer', 'Child chooses "then" activity']
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
            ],
            usageCount: 22,
            lastUsed: new Date('2025-09-13'),
            parentRating: 4.0,
            adaptations: ['Added gestural prompts', 'Using favorite songs']
          }
        ].map((strategy) => (
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
                  <Badge variant="outline" className="text-slate-600">
                    Used {strategy.usageCount} times
                  </Badge>
                </div>
                
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{strategy.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{strategy.description}</p>

                {/* Usage Analytics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Parent Rating</span>
                    </div>
                    <div className="text-lg font-semibold text-green-900">{strategy.parentRating}/5.0</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-800">Last Used</span>
                    </div>
                    <div className="text-sm font-semibold text-blue-900">{strategy.lastUsed.toLocaleDateString()}</div>
                  </div>
                </div>

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
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Current Adaptations */}
                  <div>
                    <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-2">Your Adaptations:</h4>
                    <div className="flex flex-wrap gap-2">
                      {strategy.adaptations.map((adaptation, index) => (
                        <Badge key={index} variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                          <Settings className="w-3 h-3 mr-1" />
                          {adaptation}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" title="Rate strategy">
                  <Star className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title="View resources">
                  <BookOpen className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Strategy Effectiveness Chart */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Strategy Effectiveness Trends
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">85%</div>
            <div className="text-sm text-slate-600">Avg Effectiveness</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">4.2</div>
            <div className="text-sm text-slate-600">Parent Rating</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">65</div>
            <div className="text-sm text-slate-600">Times Used</div>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Visual supports are your most effective strategy category. Consider expanding use to new routines.
        </p>
      </Card>
    </div>
  );

  const renderEnhancedTracking = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl text-slate-900 dark:text-slate-100">Data & Tracking</h2>
        <p className="text-slate-600 dark:text-slate-400">Longitudinal progress monitoring and trend analysis</p>
      </div>

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5 md:p-6">
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Progress by Domain</h3>
            <div className="space-y-3 sm:space-y-4 sm:space-y-6">
              {[
                { domain: 'Communication', data: longitudinalData.trendData.communication, color: 'blue' },
                { domain: 'Social', data: longitudinalData.trendData.social, color: 'green' },
                { domain: 'Adaptive', data: longitudinalData.trendData.adaptive, color: 'purple' },
                { domain: 'Overall', data: longitudinalData.trendData.overall, color: 'teal' }
              ].map((trend) => (
                <div key={trend.domain} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 bg-${trend.color}-500 rounded-full`}></div>
                      <span className="text-sm font-medium text-slate-900">{trend.domain}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">
                        {trend.data[trend.data.length - 1]}% current
                      </span>
                      <Badge variant="outline" className={
                        trend.data[trend.data.length - 1] > trend.data[trend.data.length - 2] 
                          ? 'text-green-600 border-green-200 bg-green-50'
                          : 'text-amber-600 border-amber-200 bg-amber-50'
                      }>
                        {trend.data[trend.data.length - 1] > trend.data[trend.data.length - 2] ? '+' : ''}
                        {trend.data[trend.data.length - 1] - trend.data[trend.data.length - 2]}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-12">
                    {trend.data.map((value, index) => (
                      <div key={index} className="flex-1 bg-slate-100 rounded-sm relative">
                        <div 
                          className={`bg-${trend.color}-500 rounded-sm transition-all duration-300`}
                          style={{ height: `${(value / 100) * 48}px` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Today's Progress</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Daily Goals Met</span>
                  <span className="text-sm text-slate-900 dark:text-slate-100">85%</span>
                </div>
                <Progress value={85} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Routines Completed</span>
                  <span className="text-sm text-slate-900 dark:text-slate-100">2/3</span>
                </div>
                <Progress value={67} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Strategies Used</span>
                  <span className="text-sm text-slate-900 dark:text-slate-100">4</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6">
              <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Activity Log</h3>
              <div className="space-y-3">
                {[
                  { time: '9:15 AM', activity: 'Morning routine completed', type: 'success' },
                  { time: '11:30 AM', activity: 'Used visual schedule for transition', type: 'strategy' },
                  { time: '2:45 PM', activity: 'Requested help appropriately', type: 'milestone' },
                  { time: '4:00 PM', activity: 'Provided routine feedback', type: 'feedback' }
                ].map((log, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                    <div className={`w-2 h-2 rounded-full ${
                      log.type === 'success' ? 'bg-green-500' :
                      log.type === 'strategy' ? 'bg-blue-500' :
                      log.type === 'milestone' ? 'bg-purple-500' :
                      'bg-amber-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-900">{log.activity}</div>
                      <div className="text-xs text-slate-500">{log.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5 md:p-6">
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Weekly Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">6</div>
                <div className="text-sm text-slate-600">Goals Progressed</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">14</div>
                <div className="text-sm text-slate-600">Routines Completed</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">28</div>
                <div className="text-sm text-slate-600">Strategies Used</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">92%</div>
                <div className="text-sm text-slate-600">Consistency Rate</div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">This Week's Highlight:</h4>
              <p className="text-sm text-blue-800">
                {childShort} made breakthrough progress in verbal requests, using "help me" independently 8 times this week!
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5 md:p-6">
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4">Month-over-Month Analysis</h3>
            <div className="space-y-3 sm:space-y-4">
              {longitudinalData.monthlyProgress.map((month, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">{month.month}</h4>
                    <Badge variant="outline" className="text-[#6B9080] border-[#6B9080]/20 bg-[#6B9080]/10">
                      {month.parentParticipation}% participation
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
                    <div>
                      <div className="text-slate-600">Goals Progress</div>
                      <div className="font-medium text-slate-900">
                        {Math.round(Object.values(month.goalsProgress).reduce((a, b) => a + b, 0) / Object.values(month.goalsProgress).length)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600">Routines</div>
                      <div className="font-medium text-slate-900">{month.routinesCompleted}%</div>
                    </div>
                    <div>
                      <div className="text-slate-600">Strategies</div>
                      <div className="font-medium text-slate-900">{month.strategiesUsed}</div>
                    </div>
                    <div>
                      <div className="text-slate-600">Growth Rate</div>
                      <div className="font-medium text-green-600">
                        +{index === 0 ? 25 : Math.round(Object.values(month.goalsProgress).reduce((a, b) => a + b, 0) / Object.values(month.goalsProgress).length) - 
                        Math.round(Object.values(longitudinalData.monthlyProgress[index - 1]?.goalsProgress || {1: 0}).reduce((a, b) => a + b, 0))}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderEnhancedRewards = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-slate-900 dark:text-slate-100">Rewards & Motivation</h2>
          <p className="text-slate-600 dark:text-slate-400">Personalized motivation system with engagement tracking</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Reward
        </Button>
      </div>

      {/* Motivation Status */}
      <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-600" />
          Current Motivation Level
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-amber-600">High</div>
            <div className="text-sm text-slate-600">Engagement Level</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">78%</div>
            <div className="text-sm text-slate-600">Response Rate</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">3</div>
            <div className="text-sm text-slate-600">Active Motivators</div>
          </div>
        </div>
        <div className="p-3 bg-amber-100 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>AI Insight:</strong> {childShort}'s motivation is strong for speech goals but declining for social activities. 
            Consider refreshing social rewards this week.
          </p>
        </div>
      </Card>

      {/* Current Reward System */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-lg text-slate-900 dark:text-slate-100">Current Reward System</h3>
        
        {[
          {
            id: 'r1',
            title: 'Sticker Chart',
            description: 'Visual progress tracking with favorite character stickers',
            category: 'Visual',
            effectiveness: 92,
            usage: 'Daily',
            lastRefreshed: new Date('2025-09-10'),
            motivatedBehaviors: ['Asking for help', 'Completing routines', 'Using words'],
            currentEngagement: 'High',
            adaptations: ['New superhero stickers', 'Added bonus squares', 'Child chooses placement']
          },
          {
            id: 'r2',
            title: 'Choice Time',
            description: '10 minutes of preferred activity selection',
            category: 'Activity',
            effectiveness: 88,
            usage: 'After routines',
            lastRefreshed: new Date('2025-09-05'),
            motivatedBehaviors: ['Morning routine completion', 'Bedtime cooperation'],
            currentEngagement: 'High',
            adaptations: ['Extended to 15 minutes on weekends', 'Added new activity options']
          },
          {
            id: 'r3',
            title: 'Social Praise',
            description: 'Specific verbal recognition and celebration',
            category: 'Social',
            effectiveness: 85,
            usage: 'Immediate',
            lastRefreshed: new Date('2025-09-12'),
            motivatedBehaviors: ['Turn-taking', 'Sharing', 'Peer interaction'],
            currentEngagement: 'Medium',
            adaptations: ['Added high-fives', 'Family celebration dance', 'Photo taking for milestones']
          },
          {
            id: 'r4',
            title: 'Special Sensory Bin',
            description: 'Access to favorite textures and calming materials',
            category: 'Sensory',
            effectiveness: 79,
            usage: 'As earned reward',
            lastRefreshed: new Date('2025-09-08'),
            motivatedBehaviors: ['Self-regulation', 'Transition cooperation'],
            currentEngagement: 'Medium',
            adaptations: ['Added kinetic sand', 'Rotation system every 2 weeks', 'Child helps choose items']
          }
        ].map((reward) => (
          <Card key={reward.id} className="p-4 sm:p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                    <Gift className="w-3 h-3 mr-1" />
                    {reward.category}
                  </Badge>
                  <Badge variant="outline" className={
                    reward.currentEngagement === 'High' ? 'text-green-600 border-green-200 bg-green-50' :
                    reward.currentEngagement === 'Medium' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                    'text-red-600 border-red-200 bg-red-50'
                  }>
                    {reward.currentEngagement} engagement
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{reward.effectiveness}% effective</span>
                  </div>
                </div>
                
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{reward.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{reward.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">Usage Pattern</div>
                    <div className="font-medium text-blue-900">{reward.usage}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-800">Last Refreshed</div>
                    <div className="font-medium text-green-900">{reward.lastRefreshed.toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-2">Motivates these behaviors:</h4>
                    <div className="flex flex-wrap gap-2">
                      {reward.motivatedBehaviors.map((behavior, index) => (
                        <Badge key={index} variant="outline" className="text-[#6B9080] border-[#6B9080]/20 bg-[#6B9080]/10">
                          {behavior}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm text-slate-900 dark:text-slate-100 mb-2">Current Adaptations:</h4>
                    <ul className="space-y-1">
                      {reward.adaptations.map((adaptation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                          {adaptation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" title="Refresh reward">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Track usage">
                  <BarChart3 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Motivation Trend Alert */}
      {aiInsights.motivationChecks.some(m => m.trend === 'decreasing') && (
        <Card className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">Motivation Alert</h3>
              <p className="text-sm text-red-700 mb-3">
                AI has detected declining engagement in social activities. Consider refreshing rewards or trying new motivators.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Refresh Rewards
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setActiveSection('library')}>
                  <Library className="w-4 h-4 mr-2" />
                  Find New Ideas
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const renderEnhancedLibrary = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-slate-900 dark:text-slate-100">Resource Library</h2>
          <p className="text-slate-600 dark:text-slate-400">Personalized activities and resources for {childShort}</p>
        </div>
        <Button variant="outline" size="sm">
          <Bookmark className="w-4 h-4 mr-2" />
          Save Resource
        </Button>
      </div>

      {/* Personalized Recommendations */}
      <Card className="p-6 bg-gradient-to-r from-teal-50 to-blue-50 border-[#6B9080]/20">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 bg-[#6B9080]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-[#6B9080]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">AI-Recommended for {childShort}</h3>
            <p className="text-sm text-slate-600 mb-3">
              Based on current goals and recent progress, these activities are perfectly suited for {childShort}'s development stage.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  title: 'Turn-Taking Board Games',
                  category: 'Social Skills',
                  matchReason: 'Supports cooperative play goal',
                  timeNeeded: '10-15 min',
                  difficulty: 'Just Right'
                },
                {
                  title: 'Communication Choice Boards',
                  category: 'Speech & Language',
                  matchReason: 'Matches current verbal expression level',
                  timeNeeded: '5-10 min',
                  difficulty: 'Just Right'
                },
                {
                  title: 'Sensory Story Time',
                  category: 'Regulation & Calm',
                  matchReason: 'Perfect for bedtime routine',
                  timeNeeded: '15-20 min',
                  difficulty: 'Easy'
                }
              ].map((activity, index) => (
                <div key={index} className="p-3 bg-white rounded-lg border border-[#6B9080]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[#6B9080] border-[#6B9080]/20 bg-[#6B9080]/10">
                      {activity.category}
                    </Badge>
                    <Badge variant="outline" className={
                      activity.difficulty === 'Easy' ? 'text-green-600 border-green-200 bg-green-50' :
                      activity.difficulty === 'Just Right' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                      'text-amber-600 border-amber-200 bg-amber-50'
                    }>
                      {activity.difficulty}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium text-slate-900 mb-1">{activity.title}</h4>
                  <p className="text-xs text-slate-600 mb-2">{activity.matchReason}</p>
                  <div className="text-xs text-slate-500">{activity.timeNeeded}</div>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="border-[#6B9080]/20 text-[#6B9080] hover:bg-[#6B9080]/10 mt-3">
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              View All Recommendations
            </Button>
          </div>
        </div>
      </Card>

      {/* Library Categories */}
      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="printables">Printables</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="apps">Apps</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                title: 'Emotion Identification Cards',
                category: 'Social-Emotional',
                difficulty: 'Beginner',
                time: '5-10 min',
                rating: 4.8,
                downloads: 1247,
                description: 'Visual cards to help identify and express emotions',
                tags: ['Feelings', 'Communication', 'Visual Support']
              },
              {
                title: 'Sensory Bin Ideas',
                category: 'Sensory Processing',
                difficulty: 'All Levels',
                time: '15-30 min',
                rating: 4.6,
                downloads: 892,
                description: '20+ sensory bin ideas for self-regulation',
                tags: ['Sensory', 'Calm', 'DIY']
              },
              {
                title: 'Turn-Taking Games',
                category: 'Social Skills',
                difficulty: 'Intermediate',
                time: '10-20 min',
                rating: 4.7,
                downloads: 654,
                description: 'Simple games that encourage taking turns',
                tags: ['Social', 'Play', 'Cooperation']
              },
              {
                title: 'Visual Schedule Templates',
                category: 'Daily Living',
                difficulty: 'All Levels',
                time: '5 min setup',
                rating: 4.9,
                downloads: 2341,
                description: 'Customizable daily routine visual schedules',
                tags: ['Routine', 'Visual Support', 'Independence']
              },
              {
                title: 'Calming Strategies Cards',
                category: 'Self-Regulation',
                difficulty: 'All Levels',
                time: '2-5 min',
                rating: 4.5,
                downloads: 756,
                description: 'Visual cards for self-regulation techniques',
                tags: ['Calm', 'Coping', 'Visual Support']
              },
              {
                title: 'Communication Choice Board',
                category: 'Speech & Language',
                difficulty: 'Beginner',
                time: '3-10 min',
                rating: 4.8,
                downloads: 1123,
                description: 'Helps children make choices and communicate needs',
                tags: ['Communication', 'Choice', 'Visual Support']
              }
            ].map((resource) => (
              <Card key={resource.title} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={getCategoryColor(resource.category.toLowerCase().replace(/[^a-z]/g, ''))}>
                    {resource.category}
                  </Badge>
                  <Badge variant="outline" className={
                    resource.difficulty === 'Beginner' ? 'text-green-600 border-green-200 bg-green-50' :
                    resource.difficulty === 'Intermediate' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                    'text-blue-600 border-blue-200 bg-blue-50'
                  }>
                    {resource.difficulty}
                  </Badge>
                </div>
                
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{resource.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{resource.description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-slate-600">{resource.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{resource.downloads}</span>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500">{resource.time}</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {resource.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-slate-500 border-slate-300">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline">
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                title: 'Teaching Turn-Taking',
                duration: '5:32',
                category: 'Social Skills',
                instructor: 'Sarah M., RBT',
                thumbnail: '/api/placeholder/320/180',
                views: 2341,
                rating: 4.8
              },
              {
                title: 'Visual Schedule Setup',
                duration: '8:15',
                category: 'Daily Routines',
                instructor: 'Mike K., BCBA',
                thumbnail: '/api/placeholder/320/180',
                views: 1876,
                rating: 4.9
              },
              {
                title: 'Sensory Break Activities',
                duration: '6:45',
                category: 'Self-Regulation',
                instructor: 'Lisa P., OTR/L',
                thumbnail: '/api/placeholder/320/180',
                views: 1523,
                rating: 4.7
              },
              {
                title: 'Communication Temptations',
                duration: '7:20',
                category: 'Speech & Language',
                instructor: 'Anna D., SLP',
                thumbnail: '/api/placeholder/320/180',
                views: 2105,
                rating: 4.8
              }
            ].map((video) => (
              <Card key={video.title} className="p-3 sm:p-4">
                <div className="relative mb-3">
                  <div className="w-full h-32 bg-slate-200 rounded-lg flex items-center justify-center">
                    <Video className="w-8 h-8 text-slate-400" />
                  </div>
                  <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                    {video.duration}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={getCategoryColor(video.category.toLowerCase().replace(/[^a-z]/g, ''))}>
                    {video.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-slate-600">{video.rating}</span>
                  </div>
                </div>
                
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{video.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">by {video.instructor}</p>
                <p className="text-sm text-slate-500 mb-4">{video.views} views</p>
                
                <Button className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Watch Now
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="printables" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[
              'First-Then Boards',
              'Emotion Wheels', 
              'Social Stories Templates',
              'Behavior Charts',
              'Communication Books',
              'Sensory Menu Cards'
            ].map((printable) => (
              <Card key={printable} className="p-4 hover:shadow-md transition-shadow">
                <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">{printable}</h3>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-slate-600">4.{Math.floor(Math.random() * 9) + 1}</span>
                  </div>
                  <span className="text-sm text-slate-500">PDF</span>
                </div>
                <Button size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="books" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                title: 'Social Stories for Everyday Situations',
                author: 'Dr. Patricia Martinez',
                category: 'Social Skills',
                pages: 156,
                rating: 4.9,
                description: 'A comprehensive guide to creating and using social stories'
              },
              {
                title: 'Visual Supports That Work',
                author: 'Michael K. Thompson, BCBA',
                category: 'Teaching Strategies', 
                pages: 203,
                rating: 4.7,
                description: 'Practical visual support strategies for home and school'
              },
              {
                title: 'The Sensory-Smart Child',
                author: 'Dr. Lindsey Biel, OTR/L',
                category: 'Sensory Processing',
                pages: 284,
                rating: 4.8,
                description: 'Understanding and supporting sensory differences'
              }
            ].map((book) => (
              <Card key={book.title} className="p-3 sm:p-4">
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-16 h-20 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 mb-2">
                      {book.category}
                    </Badge>
                    <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{book.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">by {book.author}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{book.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-slate-600">{book.rating}</span>
                      </div>
                      <span className="text-sm text-slate-500">{book.pages} pages</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Book
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="apps" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                name: 'Proloquo2Go',
                category: 'Communication',
                price: '$249.99',
                rating: 4.8,
                ageRange: '2-18 years',
                description: 'Full-featured communication app with natural voices',
                platform: 'iOS/Android'
              },
              {
                name: 'Autism Learning Games',
                category: 'Educational',
                price: '$4.99/month',
                rating: 4.6,
                ageRange: '3-12 years',
                description: 'Educational games designed for children with autism',
                platform: 'iOS/Android'
              },
              {
                name: 'Social Stories Creator',
                category: 'Social Skills',
                price: 'Free',
                rating: 4.5,
                ageRange: '4-16 years',
                description: 'Create personalized social stories with photos',
                platform: 'iOS only'
              }
            ].map((app) => (
              <Card key={app.name} className="p-3 sm:p-4">
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gamepad2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getCategoryColor(app.category.toLowerCase())}>
                        {app.category}
                      </Badge>
                      <Badge variant="outline" className="text-slate-600">
                        {app.platform}
                      </Badge>
                    </div>
                    <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">{app.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{app.description}</p>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-slate-600">{app.rating}</span>
                      </div>
                      <span className="text-sm text-slate-900 font-medium">{app.price}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Ages {app.ageRange}</p>
                    <Button size="sm" variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View in App Store
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Render current section
  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'goals': return renderGoalsWithBaseline();
      case 'routines': return renderEnhancedRoutines();
      case 'strategies': return renderEnhancedStrategies();
      case 'tracking': return renderEnhancedTracking();
      case 'rewards': return renderEnhancedRewards();
      case 'library': return renderEnhancedLibrary();
      case 'coaching': return renderCoaching();
      case 'safety': return renderSafetyRisk();
      case 'insights': return renderEnhancedInsights();
      case 'outcomes': return renderOutcomeMetrics();
      case 'family': return renderFamilySchool();
      case 'sharing': return renderEnhancedSharing();
      default: 
        return (
          <div className="text-center py-12">
            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-2">
              {sections.find(s => s.id === activeSection)?.title || 'Section'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              This section is coming soon with enhanced features.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Section Navigation */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-[#6B9080] to-[#7BA7BC] rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl text-slate-900 dark:text-slate-100">{childShort}'s Living Care Plan</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enhanced with baseline tracking, AI insights, and family integration
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const IconComponent = section.icon;
            const isLocked = section.tier === 'pro' && userTier !== 'pro';
            return (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-[#6B9080]/10 text-[#6B9080] border border-[#6B9080]/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                } ${isLocked ? 'opacity-60' : ''}`}
              >
                <IconComponent className="w-4 h-4" />
                {section.title}
                {isLocked && <div className="w-2 h-2 bg-amber-400 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Section Content */}
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        {renderCurrentSection()}
      </div>
    </div>
  );
}