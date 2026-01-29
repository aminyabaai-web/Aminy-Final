/**
 * Dashboard10 - The Perfect 10/10 Dashboard
 *
 * Designed per detailed spec:
 * - Calm UX for parents (reduce mental load, "exhale test")
 * - Data capture for investors/payers (adherence, outcomes)
 * - Single-scroll "Calm Hub" design
 * - Brand colors: #0D1B2A navy, #F5F5F5 cream, #577590 teal accents
 * - Inter font, 8-12px corners, soft shadows
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Home,
  BookOpen,
  Users,
  User,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Heart,
  FileText,
  Video,
  AlertCircle,
  ChevronRight,
  Clock,
  Award,
  Zap,
  Wind,
  Sun,
  Moon,
  Sunset,
  Star,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { useConversation } from '../context/ConversationContext';

// Strategic components for viral growth & upgrade conversion
import { OutcomesDashboardWidget } from './OutcomesDashboardWidget';
import { QuickShareButton } from './ShareWinFlow';
import { DifferentiationCallout } from './DifferentiationCallout';
import { ProactiveNudgeSystem } from './ProactiveNudgeSystem';
import { MorningMission, useMorningMission } from './MorningMission';
import { ActionItems } from './ActionItems';
import { HealthDataIntegration } from './HealthDataIntegration';
import { TrialProgressBanner, SoftNudgeModal, HardPaywallModal } from './TrialExperience';
import { ShareInsightInline } from './ShareInsight';
import { ReferralCard } from './ReferralCard';
import { NotificationPrompt, useShouldShowNotificationPrompt } from './NotificationPrompt';
import { supabase } from '../utils/supabase/client';

// Types
interface ChildProfile {
  id: string;
  name: string;
  age: number;
  photoUrl?: string;
  goals: {
    name: string;
    percentMet: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

interface UpcomingEvent {
  id: string;
  title: string;
  time: string;
  type: 'telehealth' | 'reminder' | 'appointment' | 'task';
}

interface DailyTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  timeEstimate: string;
}

interface DailyRoutine {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  label: string;
  icon: React.ReactNode;
  tasks: DailyTask[];
  completedCount: number;
}

interface Dashboard10Props {
  userData: {
    parentName: string;
    childName: string;
  };
  childProfile?: ChildProfile;
  onNavigate?: (destination: string) => void;
  userTier?: string;
}

// Daily tips that rotate
const DAILY_TIPS = [
  "One deep breath can reset the moment.",
  "Progress isn't always visible, but it's always happening.",
  "You're showing up, and that's what matters most.",
  "Small wins today become big changes tomorrow.",
  "Trust the process. You've got this.",
];

// Contextual chat prompts based on time of day and situation
const CONTEXTUAL_PROMPTS: Record<string, string[]> = {
  morning: [
    'Help with morning transitions',
    'Wake-up routine tips',
    'Breakfast strategies',
    'Getting ready for school',
  ],
  afternoon: [
    'Post-school decompression',
    'Homework support ideas',
    'Healthy snack transitions',
    'Managing afternoon energy',
  ],
  evening: [
    'Dinner time strategies',
    'Screen time boundaries',
    'Family activity ideas',
    'Wind-down preparations',
  ],
  bedtime: [
    'Calming bedtime routine',
    'Sleep transition tips',
    'Managing bedtime anxiety',
    'Story time suggestions',
  ],
  progress: [
    'Celebrate recent wins',
    'Next milestone planning',
    'Progress report insights',
  ],
  challenges: [
    'Meltdown prevention',
    'Sensory regulation help',
    'Communication strategies',
  ],
};

export function Dashboard10({
  userData,
  childProfile,
  onNavigate,
  userTier = 'core'
}: Dashboard10Props) {
  const [activeRoutine, setActiveRoutine] = useState<'morning' | 'afternoon' | 'evening' | 'bedtime'>('morning');
  // CHAT-FIRST: Start with chat expanded to make it the primary experience
  const [showAIChat, setShowAIChat] = useState(true);
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'resources' | 'community' | 'profile'>('home');
  const [dailyTip] = useState(() => DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)]);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showSoftNudge, setShowSoftNudge] = useState(false);
  const [showHardPaywall, setShowHardPaywall] = useState(false);
  const [conversationsUsed, setConversationsUsed] = useState(0);
  const chatButtonRef = useRef<HTMLButtonElement>(null);

  // Morning mission state
  const { shouldShow: showMorningMission, isCompleted: missionCompleted } = useMorningMission();

  // Notification prompt state
  const shouldShowNotificationPrompt = useShouldShowNotificationPrompt();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true);

  // Check trial status for free users
  useEffect(() => {
    if (userTier === 'free' && userId) {
      supabase
        .from('trial_tracking')
        .select('conversations_used, has_seen_nudge')
        .eq('user_id', userId)
        .single()
        .then(({ data }) => {
          if (data) {
            setConversationsUsed(data.conversations_used || 0);
            // Show soft nudge after 3 conversations if not seen
            if (data.conversations_used >= 3 && !data.has_seen_nudge) {
              setShowSoftNudge(true);
            }
            // Show hard paywall after 5 conversations
            if (data.conversations_used >= 5) {
              setShowHardPaywall(true);
            }
          }
        });
    }
  }, [userTier, userId]);

  // Get user ID from Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Auto-set routine based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setActiveRoutine('morning');
    else if (hour >= 12 && hour < 17) setActiveRoutine('afternoon');
    else if (hour >= 17 && hour < 20) setActiveRoutine('evening');
    else setActiveRoutine('bedtime');
  }, []);

  // Sample data (would come from API in production)
  const child: ChildProfile = childProfile || {
    id: 'child-1',
    name: userData.childName || 'Alex',
    age: 5,
    goals: [
      { name: 'Communication', percentMet: 70, trend: 'up' },
      { name: 'Regulation', percentMet: 50, trend: 'stable' },
    ]
  };

  const upcomingEvents: UpcomingEvent[] = [
    { id: '1', title: 'Speech Coaching', time: '10:00 AM', type: 'telehealth' },
    { id: '2', title: 'Meltdown Prep', time: '3:00 PM', type: 'reminder' },
  ];

  const dailyRoutines: DailyRoutine[] = [
    {
      timeOfDay: 'morning',
      label: 'Morning',
      icon: <Sun className="w-4 h-4" />,
      completedCount: 2,
      tasks: [
        { id: '1', title: 'Wake-Up Cue', description: 'Visual schedule', icon: '📋', completed: true, timeEstimate: '2 min' },
        { id: '2', title: 'Brush Teeth', description: '2 min timer', icon: '🪥', completed: true, timeEstimate: '2 min' },
        { id: '3', title: 'Breakfast Transition', description: 'Reward badge', icon: '🍳', completed: false, timeEstimate: '10 min' },
      ]
    },
    {
      timeOfDay: 'afternoon',
      label: 'Afternoon',
      icon: <Sunset className="w-4 h-4" />,
      completedCount: 0,
      tasks: [
        { id: '4', title: 'Lunch Routine', description: 'Choice board', icon: '🥗', completed: false, timeEstimate: '15 min' },
        { id: '5', title: 'Quiet Time', description: 'Sensory break', icon: '🧘', completed: false, timeEstimate: '20 min' },
      ]
    },
    {
      timeOfDay: 'evening',
      label: 'Evening',
      icon: <Moon className="w-4 h-4" />,
      completedCount: 0,
      tasks: [
        { id: '6', title: 'Family Time', description: 'Structured play', icon: '🎮', completed: false, timeEstimate: '30 min' },
        { id: '7', title: 'Dinner', description: 'Mealtime supports', icon: '🍽️', completed: false, timeEstimate: '20 min' },
      ]
    },
    {
      timeOfDay: 'bedtime',
      label: 'Bedtime',
      icon: <Star className="w-4 h-4" />,
      completedCount: 0,
      tasks: [
        { id: '8', title: 'Bath Time', description: 'Calming routine', icon: '🛁', completed: false, timeEstimate: '15 min' },
        { id: '9', title: 'Story & Wind Down', description: 'Bedtime cues', icon: '📚', completed: false, timeEstimate: '15 min' },
      ]
    },
  ];

  const currentRoutine = dailyRoutines.find(r => r.timeOfDay === activeRoutine) || dailyRoutines[0];
  const totalTasks = currentRoutine.tasks.length;
  const completedTasks = currentRoutine.tasks.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Streak data
  const streakDays = 5;
  const todaysWins = 3;

  // Get contextual prompts based on time of day and child progress
  const getContextualPrompts = () => {
    const timePrompts = CONTEXTUAL_PROMPTS[activeRoutine] || CONTEXTUAL_PROMPTS.morning;
    const progressPrompts = child.goals.some(g => g.percentMet >= 70) ? CONTEXTUAL_PROMPTS.progress : CONTEXTUAL_PROMPTS.challenges;
    // Mix time-based and progress-based prompts
    return [...timePrompts.slice(0, 2), ...progressPrompts.slice(0, 1)];
  };

  // Celebrate milestone streaks (5, 7, 14, 21, 30 days)
  useEffect(() => {
    const milestones = [5, 7, 14, 21, 30, 60, 90];
    if (milestones.includes(streakDays)) {
      setShowStreakCelebration(true);
      const timer = setTimeout(() => setShowStreakCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [streakDays]);

  // Quick actions
  const quickActions = [
    { id: 'plan', label: 'Update Plan', icon: <FileText className="w-5 h-5" />, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
    { id: 'calm', label: 'Calm Tools', icon: <Wind className="w-5 h-5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { id: 'log', label: 'Log Incident', icon: <AlertCircle className="w-5 h-5" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    { id: 'telehealth', label: 'Telehealth', icon: <Video className="w-5 h-5" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    { id: 'resources', label: 'Resources', icon: <BookOpen className="w-5 h-5" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    { id: 'community', label: 'Community', icon: <Users className="w-5 h-5" />, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  ];

  const handleQuickAction = (actionId: string) => {
    if (!onNavigate) return;

    switch (actionId) {
      case 'telehealth':
        onNavigate('telehealth');
        break;
      case 'calm':
        onNavigate('calm-tools');
        break;
      case 'log':
        onNavigate('incident-log');
        break;
      case 'plan':
        onNavigate('care-plan');
        break;
      case 'resources':
        onNavigate('resources');
        break;
      case 'community':
        onNavigate('community');
        break;
      default:
    }
  };

  const handleTaskToggle = (taskId: string) => {
    // Would update backend in production
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-slate-900 pb-24">
      {/* ========================================
          STREAK CELEBRATION OVERLAY
          Animated celebration for milestone streaks
          ======================================== */}
      {showStreakCelebration && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-8 rounded-3xl shadow-2xl pointer-events-auto"
          >
            <div className="text-center">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                {streakDays}-Day Streak!
              </h2>
              <p className="text-amber-100">
                Amazing consistency, {userData.parentName}!
              </p>
              <p className="text-sm text-amber-200 mt-2">
                {child.name} is building great habits thanks to you.
              </p>
              <button
                onClick={() => setShowStreakCelebration(false)}
                className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm transition-colors"
              >
                Keep Going! 💪
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================
          1. HEADER & TOP NAVIGATION (20%)
          ======================================== */}
      <header className="bg-[#0D1B2A] text-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Greeting */}
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-[#F5F5F5]">
              Hi {userData.parentName || 'there'}, here's {child.name}'s calm start today.
            </h1>
            <p className="text-sm text-gray-400 italic mt-1">{dailyTip}</p>
          </div>

          {/* Child Profile Snapshot */}
          <div className="flex items-center gap-3 sm:gap-4 bg-white/10 rounded-xl p-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-xl font-bold">
              {child.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{child.name}</span>
                <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                  Age {child.age}
                </Badge>
              </div>
              <div className="flex gap-3 mt-1">
                {child.goals && child.goals.length > 0 ? (
                  child.goals.slice(0, 2).map((goal) => (
                    <div key={goal.name} className="text-xs text-gray-300">
                      {goal.name}: <span className={goal.trend === 'up' ? 'text-green-400' : 'text-gray-400'}>{goal.percentMet}%</span>
                      {goal.trend === 'up' && ' ↑'}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400">
                    No goals set yet • Tap to add
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>

          {/* Upcoming Events Carousel */}
          <div className="flex gap-2 sm:gap-3 mt-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  className="flex-shrink-0 bg-white/10 hover:bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2 transition-colors"
                >
                  {event.type === 'telehealth' ? (
                    <Video className="w-4 h-4 text-teal-400" />
                  ) : (
                    <Calendar className="w-4 h-4 text-amber-400" />
                  )}
                  <div className="text-left">
                    <div className="text-sm font-medium">{event.title}</div>
                    <div className="text-xs text-gray-400">{event.time}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-gray-400 py-2">
                You're all caught up! No upcoming events.
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* ========================================
            PROACTIVE NUDGES - AI that reaches out
            (Aminy's unique proactive support)
            ======================================== */}
        <ProactiveNudgeSystem
          childName={child.name}
          onActionTaken={(nudgeId) => {
            // Track nudge interaction for analytics
            if (import.meta.env.DEV) {
              console.log('Nudge action taken:', nudgeId);
            }
            // In production, this would send to analytics
          }}
        />

        {/* ========================================
            MORNING MISSION - Daily engagement anchor
            Shows prominently in morning to drive DAU
            ======================================== */}
        {showMorningMission && (
          <MorningMission
            childName={child.name}
            parentName={userData.parentName || 'there'}
            streakDays={streakDays}
            onComplete={() => {
              // Track mission completion for analytics
              if (import.meta.env.DEV) {
                console.log('Morning mission completed');
              }
            }}
            onOpenChat={() => setShowAIChat(true)}
            onViewPlan={() => onNavigate?.('care-plan')}
            className="mb-4"
          />
        )}

        {/* ========================================
            2. DAILY FLOW (30%) - Routine Hub
            ======================================== */}
        <section>
          {/* Time of Day Selector */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {dailyRoutines.map((routine) => (
              <button
                key={routine.timeOfDay}
                onClick={() => setActiveRoutine(routine.timeOfDay)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  activeRoutine === routine.timeOfDay
                    ? 'bg-[#577590] text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {routine.icon}
                <span className="font-medium text-sm">{routine.label}</span>
                {routine.completedCount > 0 && (
                  <Badge className="bg-green-500 text-white text-xs">
                    {routine.completedCount}/{routine.tasks.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Current Routine Card */}
          <Card className="p-4 bg-white dark:bg-slate-800 shadow-sm border-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {currentRoutine.icon}
                {currentRoutine.label} Routine
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {completedTasks}/{totalTasks} complete
              </span>
            </div>

            {/* Progress Bar */}
            <Progress value={progressPercent} className="h-2 mb-4" />

            {/* Task List */}
            <div className="space-y-3">
              {currentRoutine.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskToggle(task.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    task.completed
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-2xl">{task.icon}</span>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${task.completed ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                      {task.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{task.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{task.timeEstimate}</span>
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* AI Nudge */}
            {completedTasks > 0 && completedTasks < totalTasks && (
              <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <p className="text-sm text-teal-800 dark:text-teal-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  One task away from completing {currentRoutine.label.toLowerCase()}!
                </p>
              </div>
            )}
          </Card>
        </section>

        {/* ========================================
            3. OUTCOMES DASHBOARD - Measurable Progress
            Shows real value that makes subscription essential
            ======================================== */}
        <section>
          <OutcomesDashboardWidget
            onViewDetails={() => onNavigate?.('progress-report')}
          />
        </section>

        {/* ========================================
            DIFFERENTIATION CALLOUT - Why Aminy Works
            Makes the moat explicit
            ======================================== */}
        <section>
          <DifferentiationCallout variant="compact" context="dashboard" />
        </section>

        {/* ========================================
            TRIAL PROGRESS - Show free users their journey
            Makes upgrade feel natural, not forced
            ======================================== */}
        {userTier === 'free' && (
          <section>
            <TrialProgressBanner onUpgrade={() => onNavigate?.('paywall')} />
          </section>
        )}

        {/* ========================================
            NOTIFICATION PROMPT - Enable push notifications
            Personalized value proposition
            ======================================== */}
        {shouldShowNotificationPrompt && showNotificationPrompt && (
          <section>
            <NotificationPrompt
              childName={child.name}
              onDismiss={() => setShowNotificationPrompt(false)}
              onEnable={() => setShowNotificationPrompt(false)}
              variant="card"
            />
          </section>
        )}

        {/* ========================================
            SLEEP INSIGHTS - Apple Health / Google Fit
            Automatic data that predicts behavior
            ======================================== */}
        {userId && (
          <section>
            <HealthDataIntegration
              userId={userId}
              childId={child.id}
              childName={child.name}
              onSleepDataUpdate={(data) => {
                // Could trigger AI insight about sleep impact
              }}
            />
          </section>
        )}

        {/* ========================================
            4. WINS & CELEBRATIONS (10%)
            Easy viral sharing with branded images
            ======================================== */}
        <section>
          <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-0 shadow-sm">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-full">
                <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">Today's Wins</h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Completed {todaysWins} tasks! {child.name}'s streak: <strong>{streakDays} days</strong>.
                  You're building consistency — great job!
                </p>
              </div>
              {/* Viral Share Button - generates branded shareable image */}
              <QuickShareButton
                variant="compact"
                win={{
                  type: 'streak',
                  title: `${streakDays}-Day Streak!`,
                  description: `Completed ${todaysWins} tasks today with Aminy. Consistency builds habits!`,
                  metric: `${streakDays} days`,
                  date: new Date(),
                  childName: child.name,
                }}
              />
            </div>
          </Card>
        </section>

        {/* ========================================
            5. QUICK ACTION GRID (15%)
            ======================================== */}
        <section>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#577590]" />
            Quick Actions
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 active:scale-95 ${action.color}`}
              >
                {action.icon}
                <span className="text-xs font-medium text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ========================================
            6. ACTION ITEMS - Organic Data Collection
            Check-ins and screenings via conversational AI
            ======================================== */}
        {userId && (
          <section>
            <ActionItems
              userId={userId}
              childId={child.id}
              childName={child.name}
              childAge={child.age}
              parentName={userData.parentName}
              onItemComplete={(item) => {
                // Could trigger celebration or update streak
              }}
            />
          </section>
        )}

        {/* ========================================
            7. REFERRAL - Viral growth mechanism
            Prominent placement for better K-factor
            ======================================== */}
        <section>
          <ReferralCard
            referralCode={userId?.slice(0, 8) || 'AMINY'}
            referralCount={0}
            rewardEarned={0}
            variant="dashboard"
            onShare={() => {
              // Track share event for analytics
            }}
          />
        </section>
      </main>

      {/* ========================================
          6. PERSISTENT AI COMPANION (Floating)
          ======================================== */}
      {/* CHAT-FIRST: Toggle button - no longer pulsing since chat starts open */}
      {!isFullScreenChat && (
        <button
          ref={chatButtonRef}
          onClick={() => setShowAIChat(!showAIChat)}
          className={`fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
            showAIChat
              ? 'bg-gray-700 text-white rotate-0'
              : 'bg-[#577590] text-white hover:bg-[#4a6478]'
          }`}
          aria-label={showAIChat ? 'Minimize chat' : 'Open chat with Aminy'}
          aria-expanded={showAIChat}
        >
          {showAIChat ? (
            <ChevronRight className="w-6 h-6 mx-auto rotate-90" aria-hidden="true" />
          ) : (
            <MessageSquare className="w-6 h-6 mx-auto" aria-hidden="true" />
          )}
        </button>
      )}

      {/* CHAT-FIRST: Prominent Chat Panel with Full-Screen Option
          Made larger and positioned for better visibility as the primary experience */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bg-white dark:bg-slate-800 shadow-2xl z-50 overflow-hidden border border-gray-200 dark:border-slate-700 transition-all duration-300 ease-out ${
              isFullScreenChat
                ? 'inset-0 rounded-none'
                : 'bottom-20 right-4 w-[calc(100%-2rem)] max-w-sm sm:w-96 rounded-2xl'
            }`}
          >
            {/* Chat Header - Branded with Full-Screen Toggle */}
            <div className="p-4 bg-gradient-to-r from-[#0D1B2A] to-[#1a3a5c] text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-[#E07A5F]" />
                  Chat with Aminy
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#577590] text-white text-xs">AI Companion</Badge>
                  <button
                    onClick={() => setIsFullScreenChat(!isFullScreenChat)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    aria-label={isFullScreenChat ? 'Exit full screen' : 'Enter full screen'}
                  >
                    {isFullScreenChat ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  {isFullScreenChat && (
                    <button
                      onClick={() => {
                        setIsFullScreenChat(false);
                        setShowAIChat(false);
                      }}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      aria-label="Close chat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-300 mt-1">Your always-on parenting support</p>
            </div>

            {/* Chat Messages - Responsive Height */}
            <div className={`p-4 overflow-y-auto space-y-3 ${isFullScreenChat ? 'h-[calc(100vh-180px)]' : 'max-h-80'}`}>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 text-sm shadow-sm">
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                  Hi {userData.parentName}! 👋 I'm here to help with {child.name}'s day.
                  {activeRoutine === 'morning' && " Ready to start the morning routine? I can suggest activities that work for this time of day."}
                  {activeRoutine === 'afternoon' && " How's the afternoon going? Need help with any activities or transitions?"}
                  {activeRoutine === 'evening' && " Winding down for the evening? Let me help you with calming activities or dinner routines."}
                  {activeRoutine === 'bedtime' && " Bedtime approaching! I can help you prep a smooth bedtime routine."}
                </p>
              </div>

              {/* Contextual Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {getContextualPrompts().map((prompt, index) => (
                <button
                  key={index}
                  className="text-xs px-3 py-1.5 rounded-full bg-[#577590]/10 text-[#577590] hover:bg-[#577590]/20 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

            {/* Chat Input - Enhanced */}
            <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-750">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask Aminy anything..."
                  className="flex-1 px-4 py-3 text-sm rounded-xl border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-[#577590] focus:ring-2 focus:ring-[#577590]/20 transition-all"
                  aria-label="Chat message input"
                />
                <Button
                  size="sm"
                  className="bg-[#577590] hover:bg-[#4a6478] px-4 py-3 rounded-xl transition-all"
                  aria-label="Send message"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================
          7. BOTTOM NAVIGATOR TABS (Fixed)
          ======================================== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 z-20 safe-bottom">
        <div className="max-w-4xl mx-auto flex justify-around py-2">
          {[
            { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
            { id: 'resources', label: 'Resources', icon: <BookOpen className="w-5 h-5" /> },
            { id: 'community', label: 'Community', icon: <Users className="w-5 h-5" /> },
            { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                if (tab.id !== 'home' && onNavigate) {
                  onNavigate(tab.id);
                }
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-[#577590]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ========================================
          TRIAL MODALS - Soft nudge & hard paywall
          ======================================== */}
      <AnimatePresence>
        {showSoftNudge && (
          <SoftNudgeModal
            childName={child.name}
            insightsCount={conversationsUsed}
            onUpgrade={() => {
              setShowSoftNudge(false);
              onNavigate?.('paywall');
            }}
            onDismiss={async () => {
              setShowSoftNudge(false);
              // Mark as seen so it doesn't show again
              if (userId) {
                await supabase
                  .from('trial_tracking')
                  .update({ has_seen_nudge: true })
                  .eq('user_id', userId);
              }
            }}
          />
        )}

        {showHardPaywall && (
          <HardPaywallModal
            childName={child.name}
            onUpgrade={() => onNavigate?.('paywall')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dashboard10;
