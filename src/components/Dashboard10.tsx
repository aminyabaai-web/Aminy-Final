// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Dashboard10 - Your Calm Hub
 *
 * Design philosophy:
 * - Every element should pass the "exhale test" — does seeing this help the parent breathe easier?
 * - CTCA Child Standard: treat every family like YOUR child is the patient
 * - Single-scroll calm hub that celebrates consistency, not perfection
 * - Brand colors: #0D1B2A navy, #F5F5F5 cream, #6B9080 teal accents
 * - Inter font, 8-12px corners, soft shadows
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { SyncStatusBadge } from './ui/SyncStatusBadge';
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
  Loader2,
  Send,
  Stethoscope,
  Camera,
} from 'lucide-react';
import { useConversation } from '../context/ConversationContext';
import { useAuditedAction } from '../hooks/useAuditedAction';
import { useWorkflowSyncState } from '../lib/core-workflow-sync';

// Supporting components
import { OutcomesDashboardWidget } from './OutcomesDashboardWidget';
import { WellnessScoreWidget } from './WellnessScoreWidget';
import { calculateWellnessScore } from '../lib/developmental-wellness-score';
import { QuickShareButton } from './ShareWinFlow';
import { ProactiveNudgeSystem } from './ProactiveNudgeSystem';
import { ProactiveCheckIn, useProactiveCheckIns } from './ProactiveCheckIn';
import { MorningMission, useMorningMission } from './MorningMission';
import { ActionItems } from './ActionItems';
import { HealthDataIntegration } from './HealthDataIntegration';
import { TrialProgressBanner, SoftNudgeModal, HardPaywallModal } from './TrialExperience';
import { BottomNavigation } from './BottomNavigation';
import { ShareInsightInline } from './ShareInsight';
import { ReferralCard } from './ReferralCard';
import { NotificationPrompt, useShouldShowNotificationPrompt } from './NotificationPrompt';
import { supabase } from '../utils/supabase/client';
import { incrementStreak } from '../lib/streak-service';
import { useDashboardData, getDefaultRoutines, getDefaultGoals } from '../hooks/useDashboardData';
import { getUserBadges, type EarnedBadge } from '../lib/badge-service';
import { useNudgeEngine } from '../hooks/useNudgeEngine';
import { subscribeToPush, isPushSupported, getNotificationPermission } from '../lib/push-notifications';
import { triggerHaptic } from '../lib/haptics';

// Types
interface ChildProfile {
  id: string;
  name: string;
  age: number;
  photoUrl?: string;
  isPrimary?: boolean;
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
    childId?: string;
    activeChildId?: string;
    pilotEligible?: boolean;
  };
  childProfile?: ChildProfile;
  onNavigate?: (destination: string) => void;
  userTier?: string;
  userRole?: 'parent' | 'provider' | 'admin';
}

// Daily affirmations — CTCA Child Standard: validate the parent, not the metrics
const DAILY_TIPS = [
  "One deep breath can reset the whole moment. You already know that.",
  "Progress isn't always visible — but you'd be amazed how much is happening beneath the surface.",
  "You're showing up every single day. That consistency is changing everything.",
  "Today's small wins are tomorrow's breakthroughs. We see you building them.",
  "You know your child better than any algorithm ever could. Trust that.",
  "The fact that you're here means your child has exactly the parent they need.",
  "Hard days don't erase good days. The good days are still there.",
  "You don't have to be perfect. You just have to be present. And you are.",
];

// Contextual chat prompts — written as things a parent would actually say or need
const CONTEXTUAL_PROMPTS: Record<string, string[]> = {
  morning: [
    'Mornings are rough — help me make transitions easier',
    'How can I get us out the door without a meltdown?',
    'Breakfast is a battle. What should I try?',
    'School drop-off tips for today',
  ],
  afternoon: [
    'Help me with the after-school crash',
    'Homework is becoming a power struggle',
    'What can I do during the afternoon lull?',
    'How do I handle the 3pm energy burst?',
  ],
  evening: [
    'Dinner is chaotic — any strategies?',
    'How do I set screen time limits without a meltdown?',
    'What can we do together tonight?',
    'Help me start winding things down',
  ],
  bedtime: [
    'Bedtime is taking forever — help',
    'How do I calm bedtime anxiety?',
    'Sleep routine ideas that actually work',
    'Help me make bedtime feel safe',
  ],
  progress: [
    'Something went really well — let me tell you',
    'What should we work on next?',
    'Help me see how far we\'ve come',
  ],
  challenges: [
    'I\'m worried about a pattern I\'m seeing',
    'Help me understand what\'s behind this behavior',
    'I need strategies for right now',
  ],
};

export function Dashboard10({
  userData,
  childProfile,
  onNavigate,
  userTier = 'core',
  userRole = 'parent'
}: Dashboard10Props) {
  useAuditedAction('child_data');
  const [activeRoutine, setActiveRoutine] = useState<'morning' | 'afternoon' | 'evening' | 'bedtime'>('morning');
  // CHAT-FIRST: Start with chat expanded to make it the primary experience
  const [showAIChat, setShowAIChat] = useState(false);
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'resources' | 'community' | 'profile'>('home');
  const [dailyTip] = useState(() => DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)]);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [showSoftNudge, setShowSoftNudge] = useState(false);
  const [showHardPaywall, setShowHardPaywall] = useState(false);
  const [conversationsUsed, setConversationsUsed] = useState(0);
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get conversation context for sending messages
  const { messages: chatMessages, sendMessage, createConversation, setChildContext, currentConversation } = useConversation();

  // Morning mission state
  const { shouldShow: showMorningMission, isCompleted: missionCompleted } = useMorningMission();

  // Pending session reviews for parent approval
  const [pendingReviews, setPendingReviews] = useState<Array<{ id: string; childName: string; sessionDate: string; providerName?: string }>>([]);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('session_notes')
      .select('id, child_name, session_date, provider_id')
      .eq('parent_id', userId)
      .eq('status', 'parent_review')
      .order('session_date', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) {
          console.error('[Dashboard] session_notes query error:', error);
          return;
        }
        if (data && data.length > 0) {
          setPendingReviews(data.map(d => ({
            id: d.id,
            childName: d.child_name || userData?.childName || 'Your Child',
            sessionDate: d.session_date,
          })));
        }
      });
  }, [userId, userData?.childName]);

  // Notification prompt state
  const shouldShowNotificationPrompt = useShouldShowNotificationPrompt();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true);

  // Proactive check-in system
  const { currentCheckIn, dismissCheckIn, triggerCheckIn } = useProactiveCheckIns();

  // Nudge engine for personalized tips
  const { getNudge, getPersonalizedTip } = useNudgeEngine();
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);

  // Initialize nudge tip on mount
  useEffect(() => {
    const tip = getNudge() || getPersonalizedTip();
    if (tip) {
      setActiveTip(tip);
      setShowTip(true);
    }
  }, [getNudge, getPersonalizedTip]);

  // The dashboard already carries inline coaching cards; avoid stacking another floating prompt on load.
  useEffect(() => {
    return undefined;
  }, []);

  // Initialize push notification subscription on first dashboard load
  useEffect(() => {
    if (!userId) return;
    const pushInitKey = `aminy_push_init_${userId}`;
    const alreadyInitialized = localStorage.getItem(pushInitKey);
    if (alreadyInitialized) return;

    // Only auto-subscribe if user already granted permission previously
    if (isPushSupported() && getNotificationPermission() === 'granted') {
      subscribeToPush(userId).then((sub) => {
        if (sub) {
          localStorage.setItem(pushInitKey, 'true');
        }
      }).catch((err) => {
        if (import.meta.env.DEV) console.warn('Push subscription init failed:', err);
      });
    }
  }, [userId]);

  // Check trial status for free users
  useEffect(() => {
    if (userTier === 'free' && userId) {
      supabase
        .from('trial_tracking')
        .select('conversations_used, has_seen_nudge')
        .eq('user_id', userId)
        .limit(1)
        .then(({ data }) => {
          const trial = Array.isArray(data) ? data[0] : null;
          if (trial) {
            setConversationsUsed(trial.conversations_used || 0);
            // Show soft nudge after 3 conversations if not seen
            if (trial.conversations_used >= 3 && !trial.has_seen_nudge) {
              setShowSoftNudge(true);
            }
            // Show hard paywall after 5 conversations
            if (trial.conversations_used >= 5) {
              setShowHardPaywall(true);
            }
          }
        });
    }
  }, [userTier, userId]);

  // Get user ID from Supabase + increment daily streak
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        // Record daily activity — this keeps the streak alive
        incrementStreak(user.id).catch(() => {});
        // Load earned badges
        getUserBadges(user.id).then(b => setBadges(b)).catch(() => {});
      }
    });
  }, []);

  // Set up conversation context when child data is available
  // Only create conversation once - don't re-run when currentConversation changes
  useEffect(() => {
    if (userId && userData.childName && !currentConversation) {
      const childId = userData.activeChildId || userData.childId || `child-${userId.substring(0, 8)}`;
      setChildContext(childId);
      createConversation(childId, `Chat about ${userData.childName}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when userId/childName available, not on currentConversation changes
  }, [userId, userData.childName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle sending chat messages
  const handleSendChat = async () => {
    if (!chatInput.trim() || isSendingChat) return;

    const messageText = chatInput.trim();
    setChatInput('');
    setIsSendingChat(true);

    try {
      const childId = userData.activeChildId || userData.childId || `child-${userId?.substring(0, 8) || 'temp'}`;
      await sendMessage('parent', messageText, { childId });

      // Increment trial conversation count for free users
      if (userTier === 'free' && userId) {
        setConversationsUsed(prev => prev + 1);
        // Non-critical - count tracking failure shouldn't affect chat
        await Promise.resolve(supabase.rpc('increment_trial_conversations', { user_id_param: userId })).catch((err: unknown) => {
          if (import.meta.env.DEV) console.warn('Trial count increment failed:', err);
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setChatInput(messageText); // Restore input on error
    } finally {
      setIsSendingChat(false);
    }
  };

  // Handle Enter key in chat
  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  // Multi-child support
  const [activeChildId, setActiveChildId] = useState<string | undefined>(undefined);

  // Load real dashboard data from database (with child filtering)
  const dashboardData = useDashboardData(userId || undefined, activeChildId);

  // Auto-set routine based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setActiveRoutine('morning');
    else if (hour >= 12 && hour < 17) setActiveRoutine('afternoon');
    else if (hour >= 17 && hour < 20) setActiveRoutine('evening');
    else setActiveRoutine('bedtime');
  }, []);

  // Use real data from hook, with fallback for empty states
  // SAFETY: Always ensure arrays are defined before accessing .length or .map()
  const child: ChildProfile = dashboardData.childProfile || childProfile || {
    id: `child-${userId?.substring(0, 8) || 'temp'}`,
    name: userData.childName || 'Your Child',
    age: 5,
    goals: getDefaultGoals(userData.childName).map(g => ({
      name: g.name,
      percentMet: g.progress,
      trend: g.trend,
    })),
  };

  // SAFETY: Ensure upcomingEvents is always an array
  const safeUpcomingEvents = Array.isArray(dashboardData.upcomingEvents) ? dashboardData.upcomingEvents : [];
  const upcomingEvents: UpcomingEvent[] = safeUpcomingEvents.length > 0
    ? safeUpcomingEvents
    : [
        { id: '1', title: 'Book your first expert session', time: 'Free consultation available', type: 'telehealth' as const },
      ];

  // Build routines from real data or use defaults
  const routineIcons: Record<string, React.ReactNode> = {
    morning: <Sun className="w-4 h-4" />,
    afternoon: <Sunset className="w-4 h-4" />,
    evening: <Moon className="w-4 h-4" />,
    bedtime: <Star className="w-4 h-4" />,
  };

  // SAFETY: Ensure todaysRoutines is always an array
  const safeTodaysRoutines = Array.isArray(dashboardData.todaysRoutines) ? dashboardData.todaysRoutines : [];
  const dailyRoutines: DailyRoutine[] = safeTodaysRoutines.length > 0
    ? safeTodaysRoutines.map(r => ({
        timeOfDay: r.timeOfDay,
        label: r.label,
        icon: routineIcons[r.timeOfDay] || <Sun className="w-4 h-4" />,
        tasks: Array.isArray(r.tasks) ? r.tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          icon: t.icon,
          completed: t.completed,
          timeEstimate: t.timeEstimate,
        })) : [],
        completedCount: r.completedCount ?? 0,
      }))
    : getDefaultRoutines(userData.childName).map(r => ({
        ...r,
        icon: routineIcons[r.timeOfDay] || <Sun className="w-4 h-4" />,
      }));

  // SAFETY: Ensure currentRoutine and tasks are always defined
  const currentRoutine = dailyRoutines.find(r => r.timeOfDay === activeRoutine) || dailyRoutines[0] || {
    timeOfDay: 'morning' as const,
    label: 'Morning Routine',
    icon: <Sun className="w-4 h-4" />,
    tasks: [],
    completedCount: 0,
  };
  const safeTasks = Array.isArray(currentRoutine.tasks) ? currentRoutine.tasks : [];
  const activePlanSnapshotId = dashboardData.activePlanSnapshotId;
  const totalTasks = safeTasks.length;
  const completedTasks = safeTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const aiMemorySync = useWorkflowSyncState('aiMemory');
  const juniorProgressSync = useWorkflowSyncState('juniorProgress');

  // Real streak data from database
  const streakDays = dashboardData.streak;
  const todaysWins = dashboardData.milestonesEarned;

  const wellnessScore = useMemo(() => {
    const completedToday = safeTodaysRoutines.reduce(
      (sum, r) => sum + (r.completedCount ?? 0),
      0,
    );
    return calculateWellnessScore({
      goalProgress: dashboardData.activeGoals.map((g) => ({
        domain: g.name,
        currentPct: g.progress,
        baselinePct: 0,
        targetPct: 100,
      })),
      streakDays,
      activitiesThisWeek: completedToday + Math.round((dashboardData.routineAdherence / 100) * 7),
      calmCornerSessions: Math.round(dashboardData.totalCalmMinutes / 5),
      providerSessionsAttended: 0,
      providerSessionsScheduled: 0,
      parentEngagementDays: Math.min(7, streakDays),
      incidentsTrend: 0,
    });
  }, [
    dashboardData.activeGoals,
    dashboardData.routineAdherence,
    dashboardData.totalCalmMinutes,
    streakDays,
    safeTodaysRoutines,
  ]);

  const shouldShowWellnessScore = wellnessScore.confidence >= 25;
  const hasRoutineHistory =
    dashboardData.routineAdherence > 0 ||
    safeTodaysRoutines.some((routine) => (routine.completedCount ?? 0) > 0) ||
    completedTasks > 0;
  const hasEstablishedUsage = streakDays >= 3 || todaysWins > 0 || hasRoutineHistory;
  const shouldShowProactiveNudges = hasEstablishedUsage && dashboardData.routineAdherence < 85;
  const shouldShowPersonalizedTip = showTip && Boolean(activeTip) && hasEstablishedUsage;
  const shouldShowNotificationCard =
    shouldShowNotificationPrompt && showNotificationPrompt && hasEstablishedUsage && !dashboardData.nextAppointment;
  const shouldShowSleepInsights = Boolean(userId) && (dashboardData.totalCalmMinutes > 0 || streakDays >= 5 || dashboardData.routineAdherence >= 60);
  const shouldShowWinsCard = todaysWins > 0 || streakDays >= 3;
  const shouldShowActionItems = Boolean(userId) && hasEstablishedUsage;
  const shouldShowReferralCard = streakDays >= 3 || todaysWins >= 5;
  const shouldShowOutcomesCard =
    hasEstablishedUsage ||
    dashboardData.totalCalmMinutes > 0 ||
    dashboardData.recentConversationCount > 0 ||
    dashboardData.activeGoals.some((goal) => goal.progress > 0);
  const shouldShowTrialProgress =
    userTier === 'free' && conversationsUsed > 0;
  const shouldShowStarterSummary =
    !hasEstablishedUsage &&
    dashboardData.totalCalmMinutes === 0 &&
    !dashboardData.nextAppointment;
  const shouldShowProviderReportsCard = hasEstablishedUsage;

  const hasGoalMomentum = Array.isArray(child.goals) && child.goals.some((goal) => goal.percentMet > 0);

  const getRoutineTaskIcon = (task: DailyTask): string => {
    if (!task.completed && ['✅', '☑️', '✔️'].includes(task.icon)) {
      return '•';
    }

    return task.icon;
  };

  // Get contextual prompts based on time of day and child progress
  const getContextualPrompts = () => {
    const timePrompts = CONTEXTUAL_PROMPTS[activeRoutine] || CONTEXTUAL_PROMPTS.morning;
    // SAFETY: Ensure child.goals is an array before calling .some()
    const safeGoals = Array.isArray(child.goals) ? child.goals : [];
    const progressPrompts = safeGoals.some(g => g.percentMet >= 70) ? CONTEXTUAL_PROMPTS.progress : CONTEXTUAL_PROMPTS.challenges;
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
    {
      id: 'plan',
      label: 'My Plan',
      icon: <FileText className="w-5 h-5 text-teal-700 dark:text-teal-300" />,
      accent: 'bg-teal-100 dark:bg-teal-900/30',
    },
    {
      id: 'calm',
      label: 'Calm Corner',
      icon: <Wind className="w-5 h-5 text-sky-700 dark:text-sky-300" />,
      accent: 'bg-sky-100 dark:bg-sky-900/30',
    },
    {
      id: 'log',
      label: 'Note a Moment',
      icon: <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300" />,
      accent: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      id: 'telehealth',
      label: 'Expert Care',
      icon: <Video className="w-5 h-5 text-violet-700 dark:text-violet-300" />,
      accent: 'bg-violet-100 dark:bg-violet-900/30',
    },
  ];

  const handleQuickAction = (actionId: string) => {
    triggerHaptic('light');
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

  const handleTaskToggle = async (taskId: string) => {
    // Find which routine this task belongs to
    // SAFETY: Use safeTodaysRoutines instead of direct access
    const routine = dailyRoutines.find(r => Array.isArray(r.tasks) && r.tasks.some(t => t.id === taskId));
    if (routine && safeTodaysRoutines.length > 0) {
      // Find the routine ID from dashboard data
      const routineData = safeTodaysRoutines.find(r => r.timeOfDay === routine.timeOfDay);
      if (routineData) {
        // Use the completeRoutineStep from the hook
        await dashboardData.completeRoutineStep(routineData.timeOfDay, taskId);
      }
    }
  };

  // Show loading state while data is being fetched
  if (dashboardData.isLoading && userId) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-900" style={{ background: '#FAF7F2' }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-[#6B9080] border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-[#0D1B2A] dark:text-white font-medium">Loading your calm hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen dark:bg-slate-900 pb-24"
      style={{ background: '#FAF7F2' }}
    >
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
      <header
        className="sticky top-0 z-20 border-b border-teal-100/80 backdrop-blur-xl"
        style={{ background: 'linear-gradient(135deg, rgba(247,252,252,0.95) 0%, rgba(240,249,249,0.96) 48%, rgba(238,246,250,0.97) 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Greeting */}
          <div className="mb-4">
            <h1 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950">
              Hi {userData.parentName || 'there'}, here's {child.name}'s calm start today.
            </h1>
            <h2 className="sr-only">Daily overview</h2>
            <h3 className="sr-only">Primary actions and support</h3>
            <p className="mt-1 max-w-2xl text-sm italic text-slate-600">{dailyTip}</p>
          </div>

          {/* Multi-Child Switcher */}
          {dashboardData.children.length > 1 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {dashboardData.children.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveChildId(c.id === activeChildId ? undefined : c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors flex-shrink-0 ${
                    (activeChildId === c.id || (!activeChildId && c.isPrimary))
                      ? 'border border-teal-200 bg-teal-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white/85 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-sm font-bold text-white">
                    {c.name?.[0] || '?'}
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {(aiMemorySync || juniorProgressSync) && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {aiMemorySync ? (
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-600 shadow-sm">
                  <span className="font-medium text-slate-900">AI memory</span>
                  <SyncStatusBadge status={aiMemorySync.status} />
                </div>
              ) : null}
              {juniorProgressSync ? (
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-600 shadow-sm">
                  <span className="font-medium text-slate-900">Ease progress</span>
                  <SyncStatusBadge status={juniorProgressSync.status} />
                </div>
              ) : null}
            </div>
          )}

          {/* Child Profile Snapshot */}
          <div className="flex items-center gap-3 rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-xl font-bold text-white shadow-sm">
              {child.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-950">{child.name}</span>
                <Badge variant="outline" className="border-teal-100 bg-white/85 text-sm text-slate-700">
                  Age {child.age}
                </Badge>
              </div>
              <div className="mt-1">
                {child.goals && child.goals.length > 0 ? (
                  hasGoalMomentum ? (
                    <div className="flex gap-3">
                      {child.goals.slice(0, 2).map((goal) => (
                        <div key={goal.name} className="text-sm text-slate-600">
                          {goal.name}: <span className={goal.trend === 'up' ? 'text-teal-700' : 'text-slate-500'}>{goal.percentMet}%</span>
                          {goal.trend === 'up' && ' ↑'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">
                      Starting focus areas: {child.goals.slice(0, 2).map((goal) => goal.name).join(' • ')}
                    </div>
                  )
                ) : (
                  <div className="text-sm text-slate-500">
                    No goals set yet • Tap to add
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          {/* Upcoming Events Carousel */}
          <div className="flex gap-2 sm:gap-3 mt-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() =>
                    onNavigate?.(
                      event.type === 'telehealth'
                        ? (safeUpcomingEvents.length > 0 ? 'my-appointments' : 'conversational-booking')
                        : 'care-plan'
                    )
                  }
                  className="flex-shrink-0 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-sm transition-colors hover:bg-white"
                >
                  {event.type === 'telehealth' ? (
                    <Video className="w-4 h-4 text-teal-600" />
                  ) : (
                    <Calendar className="w-4 h-4 text-amber-500" />
                  )}
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-900">{event.title}</div>
                    <div className="text-sm text-slate-500">{event.time}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-2 text-sm text-slate-500">
                You're all caught up! No upcoming events.
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {shouldShowWellnessScore && (
          <WellnessScoreWidget
            score={wellnessScore}
            childName={child.name}
            onViewDetails={() => onNavigate?.('analytics-charts')}
          />
        )}

        {/* Pending Session Reviews — parent needs to approve */}
        {pendingReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-700 rounded-xl p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-violet-100 dark:bg-violet-800 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-violet-600 dark:text-violet-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                  {pendingReviews.length === 1 ? 'Session summary ready for review' : `${pendingReviews.length} session summaries to review`}
                </p>
                <p className="text-xs text-violet-600 dark:text-violet-400">
                  Your provider shared notes from {pendingReviews[0].childName}'s session
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('parent-approval')}
              className="w-full mt-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Review & Approve
            </button>
          </motion.div>
        )}

        {/* ========================================
            PROACTIVE NUDGES - AI that reaches out
            (Aminy's unique proactive support)
            ======================================== */}
        {shouldShowProactiveNudges ? (
        <ProactiveNudgeSystem
          userId={userId || undefined}
          childName={child.name}
          parentName={userData.parentName}
          userTier={userTier}
          currentStreak={streakDays}
          routineAdherence={dashboardData.routineAdherence}
          onAction={(nudge) => {
            // Route nudge actions to appropriate screens
            if (import.meta.env.DEV) {
              console.log('Nudge action taken:', nudge.id, nudge.action?.target);
            }
            if (nudge.action?.target) {
              const targetMap: Record<string, string> = {
                'stress_check': 'calm-tools',
                'daily_log': 'incident-log',
                'quick_activity': 'care-plan',
                'outcomes': 'analytics-charts',
                'calm_tools': 'calm-tools',
                'routines': 'care-plan',
                'weekly_report': 'weekly-insights',
              };
              const screen = targetMap[nudge.action.target];
              if (screen) onNavigate?.(screen);
            }
          }}
        />
        ) : null}

        {/* Nudge Engine Personalized Tip */}
        {shouldShowPersonalizedTip && activeTip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-700 rounded-xl p-3"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-teal-800 dark:text-teal-200 flex-1">{activeTip}</p>
              <button
                onClick={() => setShowTip(false)}
                className="h-11 w-11 text-teal-400 hover:text-teal-600 flex-shrink-0 rounded-lg flex items-center justify-center"
                aria-label="Dismiss personalized tip"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Badges Row */}
        {badges.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {badges.slice(0, 8).map(badge => (
              <div
                key={badge.id}
                className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-full px-3 py-1.5 border border-gray-100 dark:border-slate-700 shadow-sm"
                title={badge.description}
              >
                <span className="text-base">{badge.emoji}</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{badge.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next Appointment Card */}
        {dashboardData.nextAppointment && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Video className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Next: {dashboardData.nextAppointment.providerName}</p>
                  <p className="text-sm text-muted-foreground">{dashboardData.nextAppointment.time}</p>
                </div>
              </div>
              {(() => {
                try {
                  const apptTime = new Date(dashboardData.nextAppointment!.time);
                  const diff = apptTime.getTime() - Date.now();
                  if (diff > 0 && diff < 15 * 60 * 1000) {
                    return (
                      <Button size="sm" onClick={() => onNavigate?.('my-appointments')}>
                        Join Call
                      </Button>
                    );
                  }
                } catch (_error) {
                  // Fall back to the generic appointment action if the date string is invalid.
                }
                return (
                  <Button size="sm" variant="outline" onClick={() => onNavigate?.('my-appointments')}>
                    View
                  </Button>
                );
              })()}
            </div>
          </div>
        )}

        {/* Weekly Summary / Starter Card */}
        {shouldShowStarterSummary ? (
          <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-white via-teal-50/60 to-sky-50/70 p-5 shadow-sm dark:border-teal-900/40 dark:from-slate-800 dark:via-teal-950/20 dark:to-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                <Wind className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Start gently today
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  You do not need a perfect week to begin. Pick one calm step, one small routine, or one quick note.
                  Aminy will build the rest around what works for your family.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="rounded-full bg-[#6B9080] text-white hover:bg-[#5A7D6E]"
                onClick={() => onNavigate?.('care-plan')}
              >
                My treatment plan
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                onClick={() => onNavigate?.('calm-tools')}
              >
                Calm Corner
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">This Week</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-teal-600">{dashboardData.routineAdherence}%</p>
                <p className="text-sm text-muted-foreground">Routine</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{dashboardData.streak || streakDays}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {dashboardData.activeGoals?.filter(g => g.progress >= 100).length || 0}/{dashboardData.activeGoals?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Goals Met</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State CTAs */}
        {(!dashboardData.activeGoals || dashboardData.activeGoals.length === 0) && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-dashed border-gray-200 dark:border-slate-700 text-center">
            <p className="text-sm text-muted-foreground mb-2">Set goals to track {child.name}'s progress</p>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.('care-plan')}>
              Set First Goal
            </Button>
          </div>
        )}

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
                    ? 'bg-[#6B9080] text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {routine.icon}
                <span className="font-medium text-sm">{routine.label}</span>
                {routine.completedCount > 0 && (
                  <Badge className="bg-green-500 text-white text-sm">
                    {routine.completedCount}/{routine.tasks.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Current Routine Card */}
          <Card
            className="p-4 bg-white dark:bg-slate-800 shadow-sm border-0"
            data-testid="active-routine-card"
            data-plan-snapshot-id={activePlanSnapshotId || ''}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {currentRoutine.icon}
                {currentRoutine.label}
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
                  data-testid={`routine-task-${task.id}`}
                  data-plan-item-id={task.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    task.completed
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-2xl">{getRoutineTaskIcon(task)}</span>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${task.completed ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                      {task.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{task.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{task.timeEstimate}</span>
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
        {shouldShowOutcomesCard && (
          <section>
            <OutcomesDashboardWidget
              onViewDetails={() => onNavigate?.('weekly-insights')}
            />
          </section>
        )}

        {/* ========================================
            TRIAL PROGRESS - Show free users their journey
            Makes upgrade feel natural, not forced
            ======================================== */}
        {shouldShowTrialProgress && (
          <section>
            <TrialProgressBanner onUpgrade={() => onNavigate?.('paywall')} />
          </section>
        )}

        {/* ========================================
            NOTIFICATION PROMPT - Enable push notifications
            Personalized value proposition
            ======================================== */}
        {shouldShowNotificationCard && (
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
        {shouldShowSleepInsights && (
          <section>
            <HealthDataIntegration
              userId={userId!}
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
        {shouldShowWinsCard && (
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
        )}

        {/* ========================================
            5. QUICK ACTION GRID (15%)
            ======================================== */}
        <section>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#6B9080]" />
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="flex min-h-[108px] flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:bg-slate-50 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/70"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.accent}`}>
                  {action.icon}
                </span>
                <span className="text-sm font-semibold text-center">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Provider Reports Card */}
          {shouldShowProviderReportsCard ? (
            <div
              className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => onNavigate?.('clinical-reports')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate?.('clinical-reports')}
            >
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-teal-700 dark:text-teal-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-teal-900 dark:text-teal-100">Provider Reports</h3>
                <p className="text-sm text-teal-700 dark:text-teal-300">Generate clinical PDFs for your child's care team</p>
              </div>
              <ChevronRight className="w-4 h-4 text-teal-400 flex-shrink-0" />
            </div>
          ) : null}
        </section>

        {/* ========================================
            6. ACTION ITEMS - Organic Data Collection
            Check-ins and screenings via conversational AI
            ======================================== */}
        {shouldShowActionItems && (
          <section>
            <ActionItems
              userId={userId!}
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
        {shouldShowReferralCard && (
          <section>
            <ReferralCard
              referralCode={userId?.slice(0, 8) || 'AMINY'}
              referralCount={0}
              rewardEarned={0}
              variant="dashboard"
              onShare={() => {
                onNavigate?.('referral-dashboard');
              }}
            />
          </section>
        )}
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
              : 'bg-[#6B9080] text-white hover:bg-[#4a6478]'
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
            <div className="p-4 bg-gradient-to-r from-[#1B2733] to-[#2D3F4F] text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-[#E07A5F]" />
                  Chat with Aminy
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#6B9080] text-white text-sm">AI Companion</Badge>
                  <button
                    onClick={() => setIsFullScreenChat(!isFullScreenChat)}
                    className="h-11 w-11 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
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
                      className="h-11 w-11 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                      aria-label="Close chat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-1">Your always-on parenting support</p>
            </div>

            {/* Chat Messages - Responsive Height */}
            <div className={`p-4 overflow-y-auto space-y-3 ${isFullScreenChat ? 'h-[calc(100vh-180px)]' : 'max-h-80'}`}>
              {/* Welcome message if no chat history */}
              {chatMessages.length === 0 && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 text-sm shadow-sm">
                  <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                    Hi {userData.parentName}! 👋 I'm here to help with {child.name}'s day.
                    {activeRoutine === 'morning' && " Ready to start the morning routine? I can suggest activities that work for this time of day."}
                    {activeRoutine === 'afternoon' && " How's the afternoon going? Need help with any activities or transitions?"}
                    {activeRoutine === 'evening' && " Winding down for the evening? Let me help you with calming activities or dinner routines."}
                    {activeRoutine === 'bedtime' && " Bedtime approaching! I can help you prep a smooth bedtime routine."}
                  </p>
                </div>
              )}

              {/* Actual chat messages */}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#6B9080] text-white ml-8'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 text-gray-700 dark:text-gray-200 mr-8'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}

              {/* Loading indicator */}
              {isSendingChat && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-3 text-sm shadow-sm mr-8">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6B9080]" />
                    <span className="text-gray-500 dark:text-gray-400">Aminy is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />

              {/* Contextual Quick Actions - only show when no messages */}
              {chatMessages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {getContextualPrompts().map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setChatInput(prompt);
                      }}
                      className="text-sm px-3 py-1.5 rounded-full bg-[#6B9080]/10 text-[#6B9080] hover:bg-[#6B9080]/20 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Input - Enhanced */}
            <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-750">
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate?.('vision-ai')}
                  className="h-12 w-12 rounded-xl bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-800/40 text-violet-600 dark:text-violet-400 transition-all flex items-center justify-center"
                  aria-label="Open Vision AI camera"
                  title="Photo &amp; Video AI"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Message Aminy AI..."
                  className="flex-1 px-4 py-3 text-sm rounded-xl border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-[#6B9080] focus:ring-2 focus:ring-[#6B9080]/20 transition-all"
                  aria-label="Chat message input"
                  disabled={isSendingChat}
                />
                <Button
                  size="sm"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isSendingChat}
                  className="h-12 w-12 bg-[#6B9080] hover:bg-[#4a6478] rounded-xl transition-all disabled:opacity-50 p-0"
                  aria-label="Send message"
                >
                  {isSendingChat ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================
          7. BOTTOM NAVIGATOR TABS (Fixed)
          ======================================== */}
      <BottomNavigation
        activeTab={activeTab}
        onNavigate={(tabId) => {
          if (tabId === 'home') {
            setActiveTab('home');
          } else if (tabId === 'ask-aminy') {
            // Center AI button — toggle inline chat or navigate to full chat
            onNavigate?.('ask-aminy');
          } else {
            setActiveTab(tabId as typeof activeTab);
            onNavigate?.(tabId);
          }
        }}
        userTier={userTier}
        userRole={userRole}
        pilotEligible={Boolean(userData.pilotEligible)}
      />

      {/* ========================================
          PROACTIVE CHECK-IN - AI-initiated engagement
          Floating card at bottom of screen
          ======================================== */}
      {currentCheckIn && (
        <ProactiveCheckIn
          type={currentCheckIn}
          isOpen={true}
          onClose={dismissCheckIn}
          onAction={(action) => {
            dismissCheckIn();
            switch (action) {
              case 'chat':
                // Open inline chat or navigate to Ask Aminy
                setShowAIChat(true);
                break;
              case 'log':
                onNavigate?.('incident-log');
                break;
              case 'review':
                onNavigate?.('weekly-insights');
                break;
              case 'close':
                // Just dismiss
                break;
            }
          }}
          childName={child.name}
        />
      )}

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
