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
 * - Brand colors: #0D1B2A navy, #F5F5F5 cream, #2A7D99 teal accents
 * - Inter font, 8-12px corners, soft shadows
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
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
  Download,
  ClipboardCheck,
  Laugh,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StreakTracker } from './StreakTracker';
import { StreakCelebration } from './StreakCelebration';
import { MicroAffirmationBanner } from './MicroAffirmationBanner';
import { useStreakTracker } from '../hooks/useStreakTracker';
import { useConversation } from '../context/ConversationContext';
import { useAuditedAction } from '../hooks/useAuditedAction';
import { useWorkflowSyncState } from '../lib/core-workflow-sync';
import { getTimeBasedGreeting } from '../lib/brand-system';

// Supporting components
import { OutcomesDashboardWidget } from './OutcomesDashboardWidget';
import { WellnessScoreWidget } from './WellnessScoreWidget';
import { AISparkleButton } from './AISparkleButton';
import { calculateWellnessScore } from '../lib/developmental-wellness-score';
import { QuickShareButton } from './ShareWinFlow';
import { ProactiveNudgeSystem } from './ProactiveNudgeSystem';
import { ProactiveCheckIn, useProactiveCheckIns, canOfferStressCheckIn } from './ProactiveCheckIn';
import { StressCheckIn } from './StressCheckIn';
import { MorningMission, useMorningMission } from './MorningMission';
import { ActionItems } from './ActionItems';
import { HealthDataIntegration } from './HealthDataIntegration';
import { TrialProgressBanner, SoftNudgeModal, HardPaywallModal } from './TrialExperience';
import { SkeletonDashboard } from './ui/Skeleton';
import { PullToRefresh } from './ui/PullToRefresh';
import { TrialCountdown } from './TrialCountdown';
import { BottomNavigation } from './BottomNavigation';
import { ShareInsightInline } from './ShareInsight';
import { ReferralCard } from './ReferralCard';
import { BehaviorInsightsCard } from './BehaviorInsightsCard';
import { NotificationPrompt, useShouldShowNotificationPrompt } from './NotificationPrompt';
import { supabase } from '../utils/supabase/client';
import { incrementStreak } from '../lib/streak-service';
import { useDashboardData, getDefaultRoutines, getDefaultGoals } from '../hooks/useDashboardData';
import { getUserBadges, type EarnedBadge } from '../lib/badge-service';
import { useNudgeEngine } from '../hooks/useNudgeEngine';
import { subscribeToPush, isPushSupported, getNotificationPermission } from '../lib/push-notifications';
import { triggerHaptic } from '../lib/haptics';
import { fireConfetti } from '../lib/confetti';
import { WeeklyOutcomeCheckIn, shouldShowWeeklyCheckIn } from './WeeklyOutcomeCheckIn';
import { BaselineAssessment, needsBaseline } from './BaselineAssessment';
import PostSessionReview from './PostSessionReview';
import { loadDueScreenings, screeningScreenFor, type ScreeningDue } from '../lib/screening-schedule';
import { SCREENING_INSTRUMENTS, type ScreeningType } from '../lib/screening-instruments';
import { updateUserContext } from '../ai/contextLayer';
import { peekTodaysIdea, ageBandForAge } from '../content/special-time-ideas';

// Screening nudge throttle — once dismissed, stay quiet for 7 days
const SCREENING_NUDGE_DISMISS_KEY = 'aminy-screening-nudge-dismissed-at';
const SCREENING_NUDGE_DISMISS_DAYS = 7;

function isScreeningNudgeDismissed(): boolean {
  try {
    const at = localStorage.getItem(SCREENING_NUDGE_DISMISS_KEY);
    if (!at) return false;
    return Date.now() - Number(at) < SCREENING_NUDGE_DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Second-parent invite card (Viral Loop 2) — same 7-day quiet period as the
// screening nudge. TRUTH NOTE: co-parent seats are included on every PAID plan
// (ManageCaregivers MAX_CAREGIVERS: free=owner only, all paid tiers >= owner+1)
// — the copy must say "paid plan", never "every plan".
export const PARTNER_INVITE_DISMISS_KEY = 'aminy-partner-invite-dismissed-at';
const PARTNER_INVITE_DISMISS_DAYS = 7;

function isPartnerInviteDismissed(): boolean {
  try {
    const at = localStorage.getItem(PARTNER_INVITE_DISMISS_KEY);
    if (!at) return false;
    return Date.now() - Number(at) < PARTNER_INVITE_DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

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
    childAge?: number;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [showSoftNudge, setShowSoftNudge] = useState(false);
  const [showHardPaywall, setShowHardPaywall] = useState(false);
  const [conversationsUsed, setConversationsUsed] = useState(0);
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showTaskCelebration, setShowTaskCelebration] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(99);
  const [showWeeklyCheckIn, setShowWeeklyCheckIn] = useState(false);
  const [showBaselineAssessment, setShowBaselineAssessment] = useState(false);
  const [postSessionReview, setPostSessionReview] = useState<{ providerId: string; providerName: string; sessionDate: string } | null>(null);

  // Billable screening-due nudge (screening-schedule engine)
  const [dueScreenings, setDueScreenings] = useState<ScreeningDue[]>([]);
  const [screeningNudgeDismissed, setScreeningNudgeDismissed] = useState(() => isScreeningNudgeDismissed());

  // Second-parent "Family account" invite card (7-day dismiss throttle)
  const [partnerInviteDismissed, setPartnerInviteDismissed] = useState(() => isPartnerInviteDismissed());

  // 4-week outcome trend data
  interface TrendPoint {
    rating: number;
    recordedAt: string;
  }
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoaded, setTrendLoaded] = useState(false);

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
          return; // table may not exist yet — handled by empty state
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
  const { currentCheckIn, showCheckIn, dismissCheckIn, triggerCheckIn } = useProactiveCheckIns();
  void triggerCheckIn; // generic greetings stay quiet on load (inline coaching cards cover them)

  // Gentle "how are YOU?" parent check-in (opened by the stress_check prompt)
  const [showParentCheckIn, setShowParentCheckIn] = useState(false);

  // Surface ONLY the gentle "how are YOU?" prompt — on its own throttle
  // (~2x/week, never consecutive days, never right after a crisis-resources
  // visit, never after opt-out). The generic greeting prompts remain off.
  useEffect(() => {
    const t = setTimeout(() => {
      if (canOfferStressCheckIn()) {
        const hour = new Date().getHours();
        if (hour >= 9 && hour < 21) showCheckIn('stress_check');
      }
    }, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Check trial status
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('trial_tracking')
      .select('conversations_used, has_seen_nudge, trial_ends_at, is_converted')
      .eq('user_id', userId)
      .limit(1)
      .then(({ data }) => {
        const trial = Array.isArray(data) ? data[0] : null;
        if (trial) {
          setConversationsUsed(trial.conversations_used || 0);
          // Show soft nudge after 3 conversations if not seen
          if (trial.conversations_used >= 3 && !trial.has_seen_nudge && userTier === 'free') {
            setShowSoftNudge(true);
          }
          // Show hard paywall after 5 conversations
          if (trial.conversations_used >= 5 && userTier === 'free') {
            setShowHardPaywall(true);
          }
          // Compute days remaining from DB (not localStorage)
          if (trial.trial_ends_at && !trial.is_converted) {
            const msLeft = new Date(trial.trial_ends_at).getTime() - Date.now();
            const days = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
            setTrialDaysRemaining(days);
          }
        }
      });
  }, [userId, userTier]);

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
      if (import.meta.env.DEV) console.error('Failed to send message:', err);
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

  // Compute due screenings once real data has settled, and publish a compact
  // summary into the AI context (profiles.ai_context via context/update) once
  // per session so chat can nudge organically.
  useEffect(() => {
    if (!userId || dashboardData.isLoading) return;
    let cancelled = false;

    const realAgeYears = dashboardData.childProfile?.age;
    const options = typeof realAgeYears === 'number' && realAgeYears > 0
      ? { childAgeMonths: Math.round(realAgeYears * 12) }
      : undefined; // engine falls back to its own children-table lookup

    loadDueScreenings(options)
      .then((due) => {
        if (cancelled) return;
        setDueScreenings(due);
        if (due.length === 0) return;
        try {
          const sessionKey = 'aminy-screenings-due-published';
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, '1');
            updateUserContext(userId, {
              screeningsDue: due.map((d) => ({
                name: d.name,
                reason: d.reason,
                billable: !!d.billable,
              })),
            });
          }
        } catch { /* sessionStorage unavailable — skip publish */ }
      })
      .catch(() => { /* non-blocking */ });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dashboardData.isLoading]);

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

  // Natural-language fallbacks: a real child name renders as "Mia's"; the
  // 'Your Child' placeholder renders as "your child's" (never the literal placeholder).
  const hasRealChildName = Boolean(child.name?.trim()) && child.name !== 'Your Child';
  const childPossessive = hasRealChildName ? `${child.name}'s` : "your child's";
  const parentFirstName = userData.parentName?.trim();

  // Special Time — today's child-led play idea (read-only peek; the screen
  // records the pick). Prefer the App-level childAge so the teaser matches the
  // special-time screen exactly (child.age falls back to 5 pre-profile-load).
  const specialTimeIdea = useMemo(
    () => peekTodaysIdea(ageBandForAge(userData.childAge ?? child.age)),
    [userData.childAge, child.age]
  );

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

  // Streak system — cloud (DB) streak merged with the local-first tracker.
  // useStreakTracker also owns milestone celebrations (once each, persisted).
  const streakTracker = useStreakTracker(userId);
  const streakDays = Math.max(dashboardData.streak, streakTracker.currentStreak);
  const todaysWins = dashboardData.milestonesEarned;

  // Map milestone day-counts to the StreakCelebration variants. Milestones
  // without a variant (3/14/60-day badges) are acknowledged silently below.
  const CELEBRATION_VARIANTS: Record<number, 'first' | 'week' | 'month' | 'hundred' | 'year'> = {
    1: 'first',
    7: 'week',
    30: 'month',
    100: 'hundred',
    365: 'year',
  };
  const pendingMilestoneDays = streakTracker.pendingMilestone?.days;
  const celebrationVariant =
    pendingMilestoneDays != null ? CELEBRATION_VARIANTS[pendingMilestoneDays] ?? null : null;

  // Badge-type milestones (no celebration variant) get marked as seen without
  // a modal, so they never wedge the pending queue.
  const { pendingMilestone: trackerPendingMilestone, dismissMilestone: trackerDismissMilestone } = streakTracker;
  useEffect(() => {
    if (trackerPendingMilestone && !CELEBRATION_VARIANTS[trackerPendingMilestone.days]) {
      trackerDismissMilestone();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackerPendingMilestone, trackerDismissMilestone]);

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
  const shouldShowBehaviorInsights = Boolean(userId) && streakDays >= 3;
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

  // Variable / intermittent reward — fires on unexpected behavioral patterns,
  // not just predictable day counts. The surprise is what makes it stick.
  useEffect(() => {
    if (!userId || dashboardData.isLoading) return;
    const today = new Date().toDateString();
    const storageKey = `aminy_pattern_reward_${userId}`;
    const lastFired = localStorage.getItem(storageKey);
    if (lastFired === today) return; // once per day max

    const PATTERN_INSIGHTS: Array<{ condition: boolean; message: string }> = [
      {
        condition: dashboardData.routineAdherence >= 80 && streakDays >= 3 && streakDays % 5 !== 0,
        message: `${streakDays} days in a row. Consistency like this is how real change happens. 🌱`,
      },
      {
        condition: safeTodaysRoutines.some(r => r.completedCount > 0 && r.completedCount === r.totalCount),
        message: 'Perfect routine today — every step done. That\'s a big win.',
      },
      {
        condition: dashboardData.activeGoals.some(g => g.progress >= 50 && g.progress < 100),
        message: 'More than halfway to a goal. Keep going — you\'re closer than it feels.',
      },
    ];

    const triggered = PATTERN_INSIGHTS.find(p => p.condition);
    if (!triggered) return;

    // 60% chance of firing on any given qualifying day — keeps it unpredictable
    if (Math.random() > 0.6) return;

    localStorage.setItem(storageKey, today);
    setTimeout(() => {
      fireConfetti('goal');
      toast.success(triggered.message, {
        duration: 5000,
        style: { background: '#F6FBFB', border: '1px solid #2A7D99', color: '#132F43' },
      });
    }, 2500); // slight delay — feels like a surprise, not an alert
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dashboardData.isLoading, dashboardData.routineAdherence, streakDays]);

  // Show weekly check-in and baseline assessment after data loads
  useEffect(() => {
    if (!userId || dashboardData.isLoading) return;
    // Baseline takes priority over weekly check-in
    if (needsBaseline(userId)) {
      setTimeout(() => setShowBaselineAssessment(true), 1500);
    } else if (shouldShowWeeklyCheckIn()) {
      setTimeout(() => setShowWeeklyCheckIn(true), 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dashboardData.isLoading]);

  // Fetch last 4 weekly check-in outcome ratings for trend view
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('outcome_events')
      .select('payload, recorded_at, created_at')
      .eq('user_id', userId)
      .eq('event_type', 'weekly_parent_checkin')
      .order('created_at', { ascending: false })
      .limit(4)
      .then(
        ({ data }) => {
          if (data && data.length > 0) {
            // Reverse so oldest is first (left side of trend)
            const points = data.reverse().map((row) => ({
              rating: (row.payload as Record<string, number>)?.goal_progress_rating ?? 0,
              recordedAt: row.recorded_at || row.created_at || '',
            }));
            setTrendData(points);
          }
          setTrendLoaded(true);
        },
        () => setTrendLoaded(true),
      );
  }, [userId]);

  // Export progress report
  const handleExportProgress = async () => {
    const parentName = userData.parentName || 'Parent';
    const childName = child?.name || userData.childName || 'Your Child';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Try the backend endpoint first
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const resp = await fetch('/reports/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId, childId: child?.id, childName }),
        });
        if (resp.ok) {
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `aminy-progress-${childName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Progress report downloaded!');
          return;
        }
      }
    } catch {
      // Fall through to client-side generation
    }

    // Client-side HTML generation fallback
    const trendRows = trendData.length > 0
      ? trendData.map((pt, i) => {
          const weekLabel = pt.recordedAt
            ? new Date(pt.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : `Week ${i + 1}`;
          const color = pt.rating >= 4 ? '#2A7D99' : pt.rating === 3 ? '#F59E0B' : '#E07A5F';
          return `<tr><td style="padding:6px 12px;">${weekLabel}</td><td style="padding:6px 12px;"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${color};vertical-align:middle;margin-right:6px;"></span>${pt.rating}/5</td></tr>`;
        }).join('')
      : '<tr><td colspan="2" style="padding:6px 12px;color:#888;">No check-in data yet</td></tr>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Aminy Progress Report — ${childName}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; color: #132F43; }
  h1 { color: #0D1B2A; font-size: 1.5rem; margin-bottom: 4px; }
  .subtitle { color: #5A6B7A; font-size: 0.9rem; margin-bottom: 32px; }
  h2 { font-size: 1rem; color: #2A7D99; margin-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; padding: 6px 12px; background: #F0F4F8; color: #3A4A57; font-size: 0.85rem; }
  td { border-bottom: 1px solid #E8E4DF; font-size: 0.9rem; }
  .footer { margin-top: 40px; font-size: 0.75rem; color: #8A9BA8; }
</style>
</head>
<body>
<h1>Progress Report — ${childName}</h1>
<p class="subtitle">Prepared for ${parentName} &bull; ${dateStr} &bull; Aminy Behavioral Wellness</p>
<h2>4-Week Check-In Trend (Goal Progress Rating 1–5)</h2>
<table>
  <thead><tr><th>Week</th><th>Rating</th></tr></thead>
  <tbody>${trendRows}</tbody>
</table>
<p class="footer">Generated by Aminy &bull; app.aminy.ai &bull; For clinical use, share with your care team.</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aminy-progress-${childName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Progress report downloaded!');
  };

  // Quick actions
  const quickActions = [
    {
      id: 'plan',
      label: 'My Plan',
      icon: <FileText className="w-5 h-5 text-[#2A7D99] dark:text-[#4795AE]" />,
      accent: 'bg-[#2A7D99]/10 dark:bg-[#2A7D99]/15',
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
    // Only fire the celebration if the task was previously incomplete
    const wasIncomplete = routine?.tasks.some(t => t.id === taskId && !t.completed);
    if (routine && safeTodaysRoutines.length > 0) {
      // Find the routine ID from dashboard data
      const routineData = safeTodaysRoutines.find(r => r.timeOfDay === routine.timeOfDay);
      if (routineData) {
        // Use the completeRoutineStep from the hook
        await dashboardData.completeRoutineStep(routineData.timeOfDay, taskId);
      }
    }
    // Show brief task celebration when marking complete (Change 4)
    if (wasIncomplete) {
      triggerHaptic('medium');
      setShowTaskCelebration(true);
      fireConfetti('task');
      setTimeout(() => setShowTaskCelebration(false), 1500);
    }
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    if (dashboardData.refresh) {
      await dashboardData.refresh();
    }
  };

  // Show skeleton while data loads instead of a blocking spinner
  if (dashboardData.isLoading && userId) {
    return (
      <div className="min-h-screen dark:bg-slate-900 pb-32" style={{ background: 'linear-gradient(180deg, #F6FBFB 0%, #EAF3F7 55%, #E4EFF5 100%)' }}>
        <div className="p-4">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen dark:bg-slate-900 pb-32"
      style={{ background: 'linear-gradient(180deg, #F6FBFB 0%, #EAF3F7 55%, #E4EFF5 100%)' }}
    >
      {/* ========================================
          TASK COMPLETION CONFETTI — CSS-only sparkle burst (Change 4)
          Auto-dismisses after 1.5s via state timeout above
          ======================================== */}
      <AnimatePresence>
        {showTaskCelebration && (
          <motion.div
            key="task-celebration"
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-32 left-1/2 z-50 -translate-x-1/2 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Done!
              <span className="ml-1 inline-flex gap-0.5">
                <span className="inline-block animate-bounce" style={{ animationDelay: '0ms' }}>✦</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '80ms' }}>✦</span>
                <span className="inline-block animate-bounce" style={{ animationDelay: '160ms' }}>✦</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================
          1. HEADER & TOP NAVIGATION (20%)
          ======================================== */}
      <header
        className="dashboard-header-bg sticky top-0 z-20 border-b border-[#E8E4DF]/80 dark:border-slate-700/80 backdrop-blur-xl"
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Greeting */}
          <div className="mb-4">
            <h1 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950" style={{ fontFamily: "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
              {getTimeBasedGreeting()}{parentFirstName ? `, ${parentFirstName}` : ''} — here's {childPossessive} calm start today.
            </h1>
            <h2 className="sr-only">Daily overview</h2>
            <h3 className="sr-only">Primary actions and support</h3>
            <p className="aminy-affirm mt-1 max-w-2xl dark:text-slate-300" style={{ fontSize: '0.95rem' }}>{dailyTip}</p>
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
                      ? 'border border-[#2A7D99]/20 bg-primary text-white shadow-sm'
                      : 'border border-[#E8E4DF] bg-white/85 text-[#5A6B7A] dark:text-slate-300 dark:bg-slate-700/50 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#2A7D99] to-[#4795AE] flex items-center justify-center text-sm font-bold text-white">
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
                <div className="flex items-center gap-2 rounded-full border border-[#E8E4DF] dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 px-3 py-1.5 text-sm text-[#5A6B7A] dark:text-slate-300 shadow-sm">
                  <span className="font-medium text-[#132F43] dark:text-slate-100">AI memory</span>
                  <SyncStatusBadge status={aiMemorySync.status} />
                </div>
              ) : null}
              {juniorProgressSync ? (
                <div className="flex items-center gap-2 rounded-full border border-[#E8E4DF] dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 px-3 py-1.5 text-sm text-[#5A6B7A] dark:text-slate-300 shadow-sm">
                  <span className="font-medium text-[#132F43] dark:text-slate-100">Ease progress</span>
                  <SyncStatusBadge status={juniorProgressSync.status} />
                </div>
              ) : null}
            </div>
          )}

          {/* Child Profile Snapshot */}
          <div className="flex items-center gap-3 rounded-[22px] border border-white/80 bg-white/80 dark:bg-slate-800/90 dark:border-slate-700 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:gap-4">
            <div className="relative" style={{ flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => onNavigate?.('profile')}
                aria-label={child.photoUrl ? `${child.name}'s photo — edit profile` : `Add a photo for ${child.name} — opens profile`}
                title={child.photoUrl ? `${child.name}'s photo — edit profile` : `Add a photo for ${child.name}`}
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-sm overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #2A7D99, #4795AE)', border: 'none', cursor: 'pointer' }}
              >
                {child.photoUrl ? (
                  <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{child.name?.trim()?.[0]?.toUpperCase() || '🙂'}</span>
                )}
              </button>
              {!child.photoUrl && (
                // Decorative "+" (add-photo affordance). The 48px avatar button above
                // is the actual tap target and carries the accessible name/title.
                <span
                  aria-hidden
                  style={{
                    position: 'absolute', bottom: -3, right: -3,
                    width: 18, height: 18, borderRadius: 9999,
                    background: '#fff', color: '#2A7D99',
                    fontSize: 13, lineHeight: '16px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.2)',
                    pointerEvents: 'none',
                  }}
                >+</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-950">{child.name}</span>
                <Badge variant="outline" className="border-[#E8E4DF] bg-white/85 text-sm text-[#3A4A57]">
                  Age {child.age}
                </Badge>
              </div>
              <div className="mt-1">
                {child.goals && child.goals.length > 0 ? (
                  hasGoalMomentum ? (
                    <div className="flex gap-3">
                      {child.goals.slice(0, 2).map((goal) => (
                        <div key={goal.name} className="text-sm text-[#5A6B7A] dark:text-slate-300">
                          {goal.name}: <span className={goal.trend === 'up' ? 'text-[#2A7D99] dark:text-teal-300' : 'text-[#5A6B7A] dark:text-slate-300'}>{goal.percentMet}%</span>
                          {goal.trend === 'up' && ' ↑'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[#5A6B7A] dark:text-slate-300">
                      Starting focus areas: {child.goals.slice(0, 2).map((goal) => goal.name).join(' • ')}
                    </div>
                  )
                ) : (
                  <div className="text-sm text-[#5A6B7A] dark:text-slate-300">
                    No goals set yet • Tap to add
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          {/* Upcoming Events Carousel */}
          <div className={`flex gap-2 sm:gap-3 mt-4 pb-2 -mx-1 px-1 scrollbar-hide ${
            upcomingEvents.length <= 1
              ? 'justify-center'             // single event → center horizontally
              : 'overflow-x-auto'            // multiple → scroll
          }`}>
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
                  className="flex items-center gap-3 flex-shrink-0 rounded-2xl border border-[#E8E4DF] dark:border-slate-700 bg-white/85 dark:bg-slate-800/85 px-4 py-3 shadow-sm transition-colors hover:bg-white dark:hover:bg-slate-800"
                >
                  <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: event.type === 'telehealth' ? '#2A7D9915' : '#F8B40015' }}>
                    {event.type === 'telehealth' ? (
                      <Video className="w-4 h-4 text-[#2A7D99]" />
                    ) : (
                      <Calendar className="w-4 h-4 text-amber-500" />
                    )}
                  </span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-[#132F43] dark:text-slate-100">{event.title}</div>
                    <div className="text-sm text-[#5A6B7A] dark:text-slate-300">{event.time}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-2 text-sm text-[#5A6B7A] dark:text-slate-300">
                You're all caught up! No upcoming events.
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Trial countdown banner — show when trial active and <= 5 days remaining */}
      {userId && trialDaysRemaining <= 5 && trialDaysRemaining >= 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-3">
          <TrialCountdown
            trialStartDate={new Date(Date.now() - (7 - trialDaysRemaining) * 24 * 60 * 60 * 1000).toISOString()}
            onUpgrade={() => onNavigate?.('paywall')}
            onInvite={() => onNavigate?.('referral-dashboard')}
            currentTier={userTier}
            dismissible={true}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Daily micro-affirmation — one quiet breath under the greeting,
            dismissible for the day (localStorage-backed). */}
        <MicroAffirmationBanner parentName={userData.parentName} />

        {shouldShowWellnessScore && (
          <motion.div className="relative" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <WellnessScoreWidget
              score={wellnessScore}
              childName={child.name}
              onViewDetails={() => onNavigate?.('analytics-charts')}
            />
            <div className="absolute top-3 right-3">
              <AISparkleButton
                prompt={`My child ${child.name} has a developmental wellness score of ${wellnessScore.composite}/100. Confidence is ${wellnessScore.confidence}%. Break down the score into its component areas with a chart, then tell me what's driving it and the most impactful things I can do this week to improve it.`}
                label="Explain score"
                visual
              />
            </div>
          </motion.div>
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
                <p className="text-sm text-violet-600 dark:text-violet-400">
                  Your provider shared notes from {pendingReviews[0].childName}'s session
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onNavigate?.('parent-approval')}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Review & Approve
              </button>
              {userId && pendingReviews[0] && (
                <button
                  onClick={() => setPostSessionReview({
                    providerId: pendingReviews[0].id,
                    providerName: pendingReviews[0].providerName || 'Your Provider',
                    sessionDate: pendingReviews[0].sessionDate,
                  })}
                  className="py-2.5 px-3 bg-white border border-violet-300 text-violet-700 rounded-lg text-sm font-medium transition-colors hover:bg-violet-50 flex items-center gap-1.5"
                >
                  <Star className="w-4 h-4" />
                  Rate
                </button>
              )}
            </div>
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
            className="bg-gradient-to-r from-[#F6FBFB] to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-[#2A7D99]/20 dark:border-teal-700 rounded-xl p-3"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#2A7D99] dark:text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[#2A7D99] dark:text-teal-200 flex-1">{activeTip}</p>
              <button
                onClick={() => setShowTip(false)}
                className="h-11 w-11 text-primary hover:text-[#2A7D99] flex-shrink-0 rounded-lg flex items-center justify-center"
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
                className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-full px-3 py-1.5 border border-[#E8E4DF] dark:border-slate-700 shadow-sm"
                title={badge.description}
              >
                <span className="text-base">{badge.emoji}</span>
                <span className="text-sm font-medium text-[#5A6B7A] dark:text-slate-300 whitespace-nowrap">{badge.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next Appointment Card */}
        {dashboardData.nextAppointment && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-[#E8E4DF] dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2A7D99]/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-[#2A7D99]" />
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
          <div className="rounded-2xl border border-[#E8E4DF] bg-gradient-to-br from-white via-transparent/60 to-sky-50/70 p-5 shadow-sm dark:border-teal-900/40 dark:from-slate-800 dark:via-teal-950/20 dark:to-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2A7D99]/10 text-[#2A7D99] dark:bg-[#2A7D99]/15 dark:text-[#4795AE]">
                <Wind className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#132F43] dark:text-slate-100">
                  Start gently today
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#5A6B7A] dark:text-slate-300">
                  You do not need a perfect week to begin. Pick one calm step, one small routine, or one quick note.
                  Aminy will build the rest around what works for your family.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-[#2A7D99]/30 bg-[#2A7D99]/10 text-[#2A7D99] hover:bg-[#2A7D99]/20 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                onClick={() => onNavigate?.('care-plan')}
              >
                My treatment plan
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-[#E8E4DF] bg-white text-[#3A4A57] hover:bg-[#F6FBFB] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                onClick={() => onNavigate?.('calm-tools')}
              >
                Calm Corner
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-[#E8E4DF] dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ fontFamily: "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif" }}>This Week</h3>
              <AISparkleButton
                prompt={`Summarize this week's progress for ${child?.name || 'my child'}: ${dashboardData.routineAdherence}% routine adherence, ${dashboardData.streak || streakDays} day streak, ${dashboardData.activeGoals?.filter(g => g.progress >= 100).length || 0} of ${dashboardData.activeGoals?.length || 0} goals met. Show me a quick visual of the week and tell me what to focus on next.`}
                label="Explain"
                visual
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-[#2A7D99] dark:text-teal-300">{dashboardData.routineAdherence}%</p>
                <p className="text-sm text-muted-foreground">Routine</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{dashboardData.streak || streakDays}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {dashboardData.activeGoals?.filter(g => g.progress >= 100).length || 0}/{dashboardData.activeGoals?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Goals Met</p>
              </div>
            </div>

            {/* Gentle 7-day streak grid */}
            <div className="mt-4">
              <StreakTracker
                currentStreak={streakDays}
                longestStreak={Math.max(streakDays, streakTracker.longestStreak)}
                isPaused={streakTracker.isPaused}
                lastCheckIn={streakTracker.hasActivityToday ? new Date().toISOString() : undefined}
              />
            </div>
          </div>
        )}

        {/* Empty State CTAs */}
        {(!dashboardData.activeGoals || dashboardData.activeGoals.length === 0) && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-dashed border-[#E8E4DF] dark:border-slate-700 text-center">
            <p className="text-sm text-muted-foreground mb-2">Set goals to track {childPossessive} progress</p>
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
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }}>
          {/* Time of Day Selector */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {dailyRoutines.map((routine) => (
              <button
                key={routine.timeOfDay}
                onClick={() => setActiveRoutine(routine.timeOfDay)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-[0.97] ${
                  activeRoutine === routine.timeOfDay
                    ? 'bg-[#2A7D99] text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-[#5A6B7A] dark:text-gray-300 hover:bg-[#EDF4F7] dark:hover:bg-slate-700'
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
              <h2 className="font-semibold text-[#132F43] dark:text-white flex items-center gap-2" style={{ fontFamily: "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
                {currentRoutine.icon}
                {currentRoutine.label}
              </h2>
              <span className="text-sm text-[#5A6B7A] dark:text-slate-300">
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
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all active:scale-[0.98] ${
                    task.completed
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-[#F6FBFB] dark:bg-slate-700/50 hover:bg-[#EDF4F7] dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-2xl">{getRoutineTaskIcon(task)}</span>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${task.completed ? 'text-green-700 dark:text-green-300' : 'text-[#132F43] dark:text-white'}`}>
                      {task.title}
                    </div>
                    <div className="text-sm text-[#5A6B7A] dark:text-slate-300">{task.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#8A9BA8] dark:text-slate-400">{task.timeEstimate}</span>
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-[#E8E4DF] dark:border-gray-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* AI Nudge */}
            {completedTasks > 0 && completedTasks < totalTasks && (
              <div className="mt-4 p-3 bg-[#2A7D99]/10 dark:bg-[#2A7D99]/10 rounded-lg border border-[#2A7D99]/20 dark:border-[#2A7D99]/30">
                <p className="text-sm text-[#2A7D99] dark:text-teal-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  One task away from completing {currentRoutine.label.toLowerCase()}!
                </p>
              </div>
            )}
          </Card>
        </motion.section>

        {/* ========================================
            SPECIAL TIME — 10 minutes of their world
            Joy-first, child-led play prompt. Not therapy: no
            scoring, no goals. White card + small teal accent —
            the routine hub above owns this region's primary teal.
            ======================================== */}
        <section>
          <button
            onClick={() => onNavigate?.('special-time')}
            data-testid="special-time-card"
            className="w-full flex items-center gap-3 rounded-xl border border-[#E8E4DF] bg-white p-4 text-left shadow-sm transition-all hover:border-[#2A7D99]/20 hover:bg-[#F6FBFB] hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/70"
            aria-label={`Special Time — 10 minutes of ${childPossessive} world. Today's idea: ${specialTimeIdea.title}`}
          >
            <div className="w-10 h-10 rounded-lg bg-[#2A7D99]/10 dark:bg-teal-800/50 flex items-center justify-center flex-shrink-0">
              <Laugh className="w-5 h-5 text-[#2A7D99] dark:text-[#4795AE]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#132F43] dark:text-slate-100">Special Time</h3>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-300">
                10 minutes of {childPossessive} world, their lead
              </p>
              <p className="text-sm font-medium text-[#2A7D99] dark:text-teal-300 mt-1">
                Today: {specialTimeIdea.title}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A9BA8] flex-shrink-0" />
          </button>
        </section>

        {/* ========================================
            WEEKLY CHECK-IN — Subtle outcome data capture
            3 questions, dismissed after completion
            ======================================== */}
        <AnimatePresence>
          {showWeeklyCheckIn && (
            <WeeklyOutcomeCheckIn
              userId={userId || ''}
              childId={child?.id}
              childName={child?.name || userData?.childName}
              onDismiss={() => setShowWeeklyCheckIn(false)}
            />
          )}
        </AnimatePresence>

        {/* ========================================
            4-WEEK OUTCOME TREND CARD
            Mini trend view from weekly check-in data
            ======================================== */}
        {trendLoaded && (
          <div className="rounded-xl border border-[#E8E4DF] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[#132F43] dark:text-slate-100">4-week trend</p>
                {trendData.length >= 2 && (
                  <p className="text-sm text-[#8A9BA8] dark:text-slate-400 mt-0.5">
                    {new Date(trendData[0].recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' – '}
                    {new Date(trendData[trendData.length - 1].recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
              <button
                onClick={handleExportProgress}
                className="flex items-center gap-1.5 text-sm text-[#2A7D99] dark:text-teal-300 hover:text-[#1F6080] dark:hover:text-teal-200 transition-colors px-2 py-1 rounded-lg hover:bg-[#2A7D99]/8"
                title="Export progress report"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>
            </div>

            {trendData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-3 text-center">
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full bg-[#E8E4DF] dark:bg-slate-600"
                    />
                  ))}
                </div>
                <p className="text-sm text-[#8A9BA8] dark:text-slate-400">
                  Complete your first check-in to see trends
                </p>
              </div>
            ) : (() => {
              const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
              const axisColor = isDark ? '#94a3b8' : '#8A9BA8';
              const gridColor = isDark ? '#334155' : '#EEF2F4';
              const chartData = trendData.map((pt, i) => ({
                label: pt.recordedAt
                  ? new Date(pt.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : `Wk ${i + 1}`,
                rating: pt.rating,
              }));
              return (
                <div>
                  <div className="w-full" style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashTrendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2A7D99" stopOpacity={0.32} />
                            <stop offset="100%" stopColor="#2A7D99" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: axisColor }}
                          axisLine={{ stroke: gridColor }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 5]}
                          ticks={[0, 1, 2, 3, 4, 5]}
                          tick={{ fontSize: 11, fill: axisColor }}
                          axisLine={false}
                          tickLine={false}
                          width={28}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: 12,
                            borderRadius: 8,
                            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                            background: isDark ? '#1e293b' : '#ffffff',
                            color: isDark ? '#e2e8f0' : '#132F43',
                          }}
                          formatter={(value) => [`${value}/5`, 'Goal progress'] as [string, string]}
                        />
                        <Area
                          type="monotone"
                          dataKey="rating"
                          stroke="#2A7D99"
                          strokeWidth={2.5}
                          fill="url(#dashTrendFill)"
                          dot={{ r: 4, fill: '#2A7D99', stroke: isDark ? '#1e293b' : '#ffffff', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 text-sm text-[#8A9BA8] dark:text-slate-400 text-center">
                    Goal progress, last 4 check-ins
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================
            PROGRESS HOME LINK — compact entry to the one
            "look how far you've come" view (wins first, streak,
            trend, goals as journeys). Quiet white card, neutral
            steel accent — the trend chart above owns this
            region's teal.
            ======================================== */}
        <section>
          <button
            onClick={() => onNavigate?.('progress')}
            data-testid="progress-home-card"
            className="w-full flex items-center gap-3 rounded-xl border border-[#E8E4DF] bg-white p-4 text-left shadow-sm transition-all hover:border-[#2A7D99]/20 hover:bg-[#F6FBFB] hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/70"
            aria-label={`Progress — ${childPossessive} wins, streak, trends and goals in one place`}
          >
            <div className="w-10 h-10 rounded-lg bg-[#EDF4F7] dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-[#577590] dark:text-slate-300" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#132F43] dark:text-slate-100">Progress</h3>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-300">
                Wins, trends and goals — look how far you&rsquo;ve come
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A9BA8] flex-shrink-0" />
          </button>
        </section>

        {/* ========================================
            3. OUTCOMES DASHBOARD - Measurable Progress
            Shows real value that makes subscription essential
            ======================================== */}
        {shouldShowOutcomesCard && (
          <section className="relative">
            <OutcomesDashboardWidget
              onViewDetails={() => onNavigate?.('weekly-insights')}
            />
            <div className="absolute top-3 right-3">
              <AISparkleButton
                prompt={`Based on ${child.name}'s outcomes data, show me a chart of recent trends, then call out what's going well, what needs attention, and what to prioritize with the therapy team.`}
                label="Analyze"
                visual
              />
            </div>
          </section>
        )}

        {/* Export progress report button — shown when there's outcome data or established usage */}
        {(trendLoaded && (trendData.length > 0 || hasEstablishedUsage)) && (
          <button
            onClick={handleExportProgress}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#2A7D99]/30 dark:border-teal-700 bg-white dark:bg-slate-800 text-[#2A7D99] dark:text-teal-300 text-sm font-medium hover:bg-[#2A7D99]/5 dark:hover:bg-teal-900/20 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export progress report
          </button>
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
            BEHAVIOR INSIGHTS - Weekly pattern digest
            Surfaces AI-ready analysis from logged data
            ======================================== */}
        {shouldShowBehaviorInsights && (
          <section>
            <BehaviorInsightsCard
              childId={userData.childId || userData.activeChildId}
              childName={child.name}
              onOpenChat={(prompt) => {
                setShowAIChat(true);
                setChatInput(prompt);
              }}
              onNavigate={onNavigate}
            />
          </section>
        )}

        {/* ========================================
            5. QUICK ACTION GRID (15%)
            ======================================== */}
        <section>
          <h2 className="font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2" style={{ fontFamily: "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
            <Zap className="w-5 h-5 text-[#2A7D99]" />
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="flex min-h-[108px] flex-col items-center gap-2 rounded-xl border border-[#E8E4DF] bg-white p-4 text-[#3A4A57] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2A7D99]/20 hover:bg-[#F6FBFB] hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/70"
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
              className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-[#F6FBFB] to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-[#2A7D99]/20 dark:border-[#2A7D99]/30 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => onNavigate?.('clinical-reports')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate?.('clinical-reports')}
            >
              <div className="w-10 h-10 rounded-lg bg-[#2A7D99]/10 dark:bg-teal-800/50 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-[#2A7D99] dark:text-[#4795AE]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-[#2A7D99] dark:text-teal-100">Provider Reports</h3>
                <p className="text-sm text-[#2A7D99] dark:text-[#4795AE]">Generate clinical PDFs for your child's care team</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
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
            SCREENING NUDGE — one quiet card when a validated
            check-in is due (screening-schedule engine).
            COMPLIANCE: never promises coverage — "often covered
            when reviewed with your provider".
            ======================================== */}
        {dueScreenings.length > 0 && !screeningNudgeDismissed && (() => {
          const first = dueScreenings[0];
          const minutes = SCREENING_INSTRUMENTS[first.instrumentId as ScreeningType]?.estimatedMinutes ?? 5;
          const forChild = first.instrumentId !== 'phq-9' && hasRealChildName;
          return (
            <section>
              <Card className="p-4 bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#2A7D99]/10 dark:bg-[#2A7D99]/15 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-[#2A7D99] dark:text-[#4795AE]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#132F43] dark:text-slate-100">
                      {first.name} is ready{forChild ? ` for ${child.name}` : ''} · {minutes} minutes
                    </h3>
                    {first.billable && (
                      <p className="text-xs text-[#8A9BA8] dark:text-slate-400 mt-0.5">
                        Often covered when reviewed with your provider.
                      </p>
                    )}
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onNavigate?.(screeningScreenFor(first.instrumentId));
                      }}
                      className="mt-2 px-4 py-1.5 rounded-lg bg-[#2A7D99] text-white text-sm font-medium hover:bg-[#1F6080] transition-colors"
                    >
                      Start
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      try { localStorage.setItem(SCREENING_NUDGE_DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
                      setScreeningNudgeDismissed(true);
                    }}
                    aria-label="Dismiss screening reminder"
                    className="p-1.5 rounded-lg text-[#8A9BA8] hover:bg-[#F6FBFB] dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </section>
          );
        })()}

        {/* ========================================
            SECOND-PARENT INVITE — Viral Loop 2. One quiet
            dismissible card (7-day throttle). Copy truth:
            co-parent seats exist on every PAID plan (free tier
            is owner-only) — never claim "free on every plan".
            ======================================== */}
        {!partnerInviteDismissed && (
          <section>
            <Card className="p-4 bg-white dark:bg-slate-800 border border-[#E8E4DF] dark:border-slate-700 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2A7D99]/10 dark:bg-[#2A7D99]/15 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-[#2A7D99] dark:text-[#4795AE]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#132F43] dark:text-slate-100">
                    Parenting together?
                  </h3>
                  <p className="text-xs text-[#8A9BA8] dark:text-slate-400 mt-0.5">
                    Add your partner — included with every paid plan, no extra cost. You&apos;ll both see {childPossessive} progress.
                  </p>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onNavigate?.('caregivers');
                    }}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-[#2A7D99] text-white text-sm font-medium hover:bg-[#1F6080] transition-colors"
                  >
                    Add your partner
                  </button>
                </div>
                <button
                  onClick={() => {
                    try { localStorage.setItem(PARTNER_INVITE_DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
                    setPartnerInviteDismissed(true);
                  }}
                  aria-label="Dismiss partner invite"
                  className="p-1.5 rounded-lg text-[#8A9BA8] hover:bg-[#F6FBFB] dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
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
      {/* CHAT-FIRST: Toggle button - no longer pulsing since chat starts open.
          bottom-36 (not bottom-24): at 390x844 the initial fold puts the teal
          time-of-day chip row exactly at y~706-761, and a bottom-24 FAB
          (y~692-748) sat on top of the teal "Bedtime Routine" chip —
          teal-on-teal read as a layout bug. bottom-36 clears the chip row and
          hovers over the (white) goals card instead. */}
      {!isFullScreenChat && (
        <button
          ref={chatButtonRef}
          onClick={() => setShowAIChat(!showAIChat)}
          className={`fixed bottom-36 right-4 z-40 w-14 h-14 rounded-full transition-all duration-300 active:scale-95 ${
            showAIChat
              ? 'bg-gray-700 text-white rotate-0 shadow-lg'
              : 'bg-[#2A7D99] text-white hover:bg-[#1F6080]'
          }`}
          style={!showAIChat ? { boxShadow: '0 0 20px rgba(42,125,153,0.15), 0 4px 12px rgba(0,0,0,0.12)' } : undefined}
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
            className={`fixed flex flex-col bg-white dark:bg-slate-800 shadow-2xl z-50 overflow-hidden border border-[#E8E4DF] dark:border-slate-700 transition-all duration-300 ease-out ${
              isFullScreenChat
                ? 'inset-0 rounded-none'
                : 'bottom-20 right-4 w-[calc(100%-2rem)] max-w-sm sm:w-96 max-h-[80vh] rounded-2xl'
            }`}
          >
            {/* Chat Header - Branded with Full-Screen Toggle */}
            <div className="flex-shrink-0 p-4 bg-gradient-to-r from-[#132F43] to-[#2D3F4F] text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-[#E07A5F]" />
                  Chat with Aminy
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#2A7D99] text-white text-sm">AI Companion</Badge>
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
              <p className="text-sm text-gray-300 dark:text-slate-300 mt-1">Your always-on parenting support</p>
            </div>

            {/* Chat Messages - flex-grow scroll region (header + input stay pinned) */}
            <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3">
              {/* Welcome message if no chat history */}
              {chatMessages.length === 0 && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 text-sm shadow-sm">
                  <p className="text-[#3A4A57] dark:text-gray-200 leading-relaxed">
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
                      ? 'bg-[#2A7D99] text-white ml-8'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 text-[#3A4A57] dark:text-gray-200 mr-8'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}

              {/* Loading indicator */}
              {isSendingChat && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-3 text-sm shadow-sm mr-8">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2A7D99]" />
                    <span className="text-[#5A6B7A] dark:text-slate-300">Aminy is thinking...</span>
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
                      className="text-sm px-3 py-1.5 rounded-full bg-[#2A7D99]/10 text-[#2A7D99] hover:bg-[#2A7D99]/20 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Input - Enhanced */}
            <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 bg-[#F6FBFB] dark:bg-slate-750">
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
                  className="flex-1 px-4 py-3 text-sm rounded-xl border-2 border-[#E8E4DF] dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-[#2A7D99] focus:ring-2 focus:ring-[#2A7D99]/20 transition-all"
                  aria-label="Chat message input"
                  disabled={isSendingChat}
                />
                <Button
                  size="sm"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isSendingChat}
                  className="h-12 w-12 bg-[#2A7D99] hover:bg-[#1F6080] rounded-xl transition-all disabled:opacity-50 p-0"
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
              case 'checkin':
                // "How are you holding up?" — the gentle parent check-in
                setShowParentCheckIn(true);
                break;
              case 'close':
                // Just dismiss
                break;
            }
          }}
          childName={child.name}
        />
      )}

      {/* Gentle parent check-in — a friend asking, not a screener */}
      <StressCheckIn
        isOpen={showParentCheckIn}
        onClose={() => setShowParentCheckIn(false)}
        context={new Date().getHours() < 12 ? 'morning' : 'evening'}
      />

      {/* ========================================
          TRIAL MODALS - Soft nudge & hard paywall
          ======================================== */}

      {/* Post-session review modal — shown when parent taps "Rate" on a pending review */}
      {postSessionReview && userId && (
        <PostSessionReview
          providerId={postSessionReview.providerId}
          providerName={postSessionReview.providerName}
          sessionDate={postSessionReview.sessionDate}
          userId={userId}
          onClose={() => setPostSessionReview(null)}
        />
      )}

      {/* Baseline assessment — modal overlay, shown once per user */}
      <AnimatePresence>
        {showBaselineAssessment && (
          <BaselineAssessment
            userId={userId || ''}
            childId={child?.id}
            childName={child?.name || userData?.childName}
            onComplete={() => setShowBaselineAssessment(false)}
            onSkip={() => setShowBaselineAssessment(false)}
          />
        )}
      </AnimatePresence>

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

      {/* ========================================
          STREAK MILESTONE CELEBRATION
          Fires once per crossed milestone (1/7/30/100/365 days), persisted in
          localStorage by useStreakTracker. Dismissible, reduced-motion aware.
          Mounted LAST: the global "[role=dialog] + *" modal CSS pins the next
          DOM sibling fullscreen, so the dialog must have no following sibling.
          ======================================== */}
      <StreakCelebration
        streakDays={streakDays}
        isOpen={celebrationVariant != null}
        onClose={trackerDismissMilestone}
        childName={child.name}
        milestone={celebrationVariant}
      />
    </div>
  );
}

export default Dashboard10;
