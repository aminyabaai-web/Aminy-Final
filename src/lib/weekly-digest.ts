/**
 * Weekly Digest Service
 *
 * Compiles a comprehensive weekly summary for edge function delivery:
 * - Child's Junior progress (sessions, skills practiced, milestones)
 * - Behavior trends (improvements, recurring challenges)
 * - Community highlights (popular posts, new connections)
 * - Personalized AI tip of the week
 *
 * Architecture:
 * - This module compiles the digest payload on the client or in an edge function
 * - Actual email rendering + sending is handled by Resend/SendGrid via Supabase Edge Function
 * - The digest can also be displayed in-app as a "Weekly Recap" card
 *
 * Schedule: Triggered every Sunday evening or Monday morning via cron
 */

import { supabase } from '../utils/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────

export interface WeeklyDigestData {
  userId: string;
  childName: string;
  parentName: string;
  email: string;
  weekStartDate: string; // ISO date (Monday)
  weekEndDate: string; // ISO date (Sunday)
  generatedAt: string;

  juniorProgress: JuniorProgressSummary;
  behaviorTrends: BehaviorTrendSummary;
  communityHighlights: CommunityHighlightSummary;
  aiTip: PersonalizedTip;
  streakInfo: StreakInfo;
  callToAction: DigestCTA;
}

export interface JuniorProgressSummary {
  totalSessions: number;
  totalMinutes: number;
  skillsPracticed: string[];
  newMilestones: string[];
  topActivity: string | null;
  progressTrend: 'improving' | 'steady' | 'declining' | 'no_data';
  comparedToLastWeek: {
    sessionsDelta: number;
    minutesDelta: number;
  };
}

export interface BehaviorTrendSummary {
  totalLogs: number;
  positiveBehaviors: number;
  challengingBehaviors: number;
  topTrigger: string | null;
  topCopingStrategy: string | null;
  moodTrend: 'improving' | 'steady' | 'declining' | 'no_data';
  weekOverWeekChange: string; // e.g., "25% fewer meltdowns"
}

export interface CommunityHighlightSummary {
  topPost: {
    title: string;
    author: string;
    likeCount: number;
  } | null;
  newReplies: number;
  postsRead: number;
  newConnections: number;
}

export interface PersonalizedTip {
  title: string;
  body: string;
  category: 'behavior' | 'communication' | 'sensory' | 'routine' | 'self_care' | 'social';
  actionUrl?: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  streakStatus: 'active' | 'at_risk' | 'broken';
  daysUntilNextMilestone: number;
  nextMilestoneName: string | null;
}

export interface DigestCTA {
  primary: {
    text: string;
    url: string;
  };
  secondary?: {
    text: string;
    url: string;
  };
}

// ── Digest generation ─────────────────────────────────────────────────

/**
 * Generate the full weekly digest payload for a user.
 * This is the main entry point — call from an edge function cron job
 * or invoke client-side for the in-app weekly recap.
 */
export async function generateWeeklyDigest(
  userId: string,
  childName: string,
  parentName: string,
  email: string
): Promise<WeeklyDigestData> {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay()); // Last Sunday
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6); // Previous Monday

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Fetch all data in parallel
  const [
    juniorProgress,
    behaviorTrends,
    communityHighlights,
    streakInfo,
  ] = await Promise.all([
    fetchJuniorProgress(userId, weekStartStr, weekEndStr),
    fetchBehaviorTrends(userId, weekStartStr, weekEndStr),
    fetchCommunityHighlights(userId, weekStartStr, weekEndStr),
    fetchStreakInfo(userId),
  ]);

  // Generate personalized tip based on this week's data
  const aiTip = generatePersonalizedTip(juniorProgress, behaviorTrends, childName);

  // Generate contextual CTA
  const callToAction = generateCTA(juniorProgress, behaviorTrends, streakInfo);

  return {
    userId,
    childName,
    parentName,
    email,
    weekStartDate: weekStartStr,
    weekEndDate: weekEndStr,
    generatedAt: now.toISOString(),
    juniorProgress,
    behaviorTrends,
    communityHighlights,
    aiTip,
    streakInfo,
    callToAction,
  };
}

// ── Data fetchers ─────────────────────────────────────────────────────

async function fetchJuniorProgress(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<JuniorProgressSummary> {
  try {
    // Fetch this week's sessions
    const { data: sessions } = await supabase
      .from('junior_sessions')
      .select('id, duration_minutes, activity_type, skills_practiced, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStart)
      .lte('created_at', `${weekEnd}T23:59:59`);

    // Fetch last week's sessions for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

    const { data: prevSessions } = await supabase
      .from('junior_sessions')
      .select('id, duration_minutes')
      .eq('user_id', userId)
      .gte('created_at', prevWeekStartStr)
      .lt('created_at', weekStart);

    // Fetch milestones
    const { data: milestones } = await supabase
      .from('user_milestones')
      .select('name')
      .eq('user_id', userId)
      .eq('is_earned', true)
      .gte('earned_at', weekStart)
      .lte('earned_at', `${weekEnd}T23:59:59`);

    const currentSessions = sessions || [];
    const previousSessions = prevSessions || [];

    const totalSessions = currentSessions.length;
    const totalMinutes = currentSessions.reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    );
    const prevTotalSessions = previousSessions.length;
    const prevTotalMinutes = previousSessions.reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    );

    // Aggregate skills
    const skillsSet = new Set<string>();
    currentSessions.forEach((s) => {
      if (Array.isArray(s.skills_practiced)) {
        s.skills_practiced.forEach((sk: string) => skillsSet.add(sk));
      }
    });

    // Top activity
    const activityCounts: Record<string, number> = {};
    currentSessions.forEach((s) => {
      const type = s.activity_type || 'general';
      activityCounts[type] = (activityCounts[type] || 0) + 1;
    });
    const topActivity =
      Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Determine trend
    let progressTrend: JuniorProgressSummary['progressTrend'] = 'no_data';
    if (totalSessions > 0 && prevTotalSessions > 0) {
      const ratio = totalSessions / prevTotalSessions;
      progressTrend = ratio > 1.1 ? 'improving' : ratio < 0.9 ? 'declining' : 'steady';
    } else if (totalSessions > 0) {
      progressTrend = 'improving';
    }

    return {
      totalSessions,
      totalMinutes,
      skillsPracticed: Array.from(skillsSet),
      newMilestones: (milestones || []).map((m) => m.name),
      topActivity,
      progressTrend,
      comparedToLastWeek: {
        sessionsDelta: totalSessions - prevTotalSessions,
        minutesDelta: totalMinutes - prevTotalMinutes,
      },
    };
  } catch (err) {
    console.error('[WeeklyDigest] Failed to fetch Junior progress:', err);
    return {
      totalSessions: 0,
      totalMinutes: 0,
      skillsPracticed: [],
      newMilestones: [],
      topActivity: null,
      progressTrend: 'no_data',
      comparedToLastWeek: { sessionsDelta: 0, minutesDelta: 0 },
    };
  }
}

async function fetchBehaviorTrends(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<BehaviorTrendSummary> {
  try {
    const { data: logs } = await supabase
      .from('behavior_logs')
      .select('id, behavior_type, trigger, coping_strategy, mood_rating, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStart)
      .lte('created_at', `${weekEnd}T23:59:59`);

    const allLogs = logs || [];
    const totalLogs = allLogs.length;

    const positiveBehaviors = allLogs.filter(
      (l) => l.behavior_type === 'positive' || (l.mood_rating && l.mood_rating >= 4)
    ).length;
    const challengingBehaviors = allLogs.filter(
      (l) => l.behavior_type === 'challenging' || (l.mood_rating && l.mood_rating <= 2)
    ).length;

    // Top trigger
    const triggerCounts: Record<string, number> = {};
    allLogs.forEach((l) => {
      if (l.trigger) {
        triggerCounts[l.trigger] = (triggerCounts[l.trigger] || 0) + 1;
      }
    });
    const topTrigger =
      Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Top coping strategy
    const copingCounts: Record<string, number> = {};
    allLogs.forEach((l) => {
      if (l.coping_strategy) {
        copingCounts[l.coping_strategy] = (copingCounts[l.coping_strategy] || 0) + 1;
      }
    });
    const topCopingStrategy =
      Object.entries(copingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Mood trend (average mood this week vs general threshold)
    const moods = allLogs
      .filter((l) => l.mood_rating != null)
      .map((l) => l.mood_rating as number);
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;

    let moodTrend: BehaviorTrendSummary['moodTrend'] = 'no_data';
    if (moods.length > 0) {
      moodTrend = avgMood >= 3.5 ? 'improving' : avgMood >= 2.5 ? 'steady' : 'declining';
    }

    // Week-over-week summary
    let weekOverWeekChange = 'No comparison data yet';
    if (totalLogs > 0 && challengingBehaviors > 0) {
      const challengeRate = Math.round((challengingBehaviors / totalLogs) * 100);
      weekOverWeekChange = `${challengeRate}% of logged behaviors were challenging`;
    } else if (totalLogs > 0) {
      weekOverWeekChange = 'All logged behaviors were positive — great progress!';
    }

    return {
      totalLogs,
      positiveBehaviors,
      challengingBehaviors,
      topTrigger,
      topCopingStrategy,
      moodTrend,
      weekOverWeekChange,
    };
  } catch (err) {
    console.error('[WeeklyDigest] Failed to fetch behavior trends:', err);
    return {
      totalLogs: 0,
      positiveBehaviors: 0,
      challengingBehaviors: 0,
      topTrigger: null,
      topCopingStrategy: null,
      moodTrend: 'no_data',
      weekOverWeekChange: 'No data available',
    };
  }
}

async function fetchCommunityHighlights(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<CommunityHighlightSummary> {
  try {
    // Top post this week
    const { data: topPosts } = await supabase
      .from('community_posts')
      .select('content, display_name, like_count')
      .gte('created_at', weekStart)
      .lte('created_at', `${weekEnd}T23:59:59`)
      .order('like_count', { ascending: false })
      .limit(1);

    const topPost = topPosts?.[0]
      ? {
          title: (topPosts[0].content || '').split('\n')[0] || 'Community Post',
          author: topPosts[0].display_name || 'Parent',
          likeCount: topPosts[0].like_count || 0,
        }
      : null;

    // Count replies to user's posts
    const { data: userPosts } = await supabase
      .from('community_posts')
      .select('id')
      .eq('user_id', userId);

    let newReplies = 0;
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map((p) => p.id);
      const { count } = await supabase
        .from('community_comments')
        .select('id', { count: 'exact', head: true })
        .in('post_id', postIds)
        .gte('created_at', weekStart)
        .lte('created_at', `${weekEnd}T23:59:59`);
      newReplies = count || 0;
    }

    return {
      topPost,
      newReplies,
      postsRead: 0, // Would need read-tracking to populate
      newConnections: 0, // Future: friend/follow system
    };
  } catch (err) {
    console.error('[WeeklyDigest] Failed to fetch community highlights:', err);
    return {
      topPost: null,
      newReplies: 0,
      postsRead: 0,
      newConnections: 0,
    };
  }
}

async function fetchStreakInfo(userId: string): Promise<StreakInfo> {
  try {
    const { data } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    if (!data) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakStatus: 'broken',
        daysUntilNextMilestone: 3,
        nextMilestoneName: 'Getting Started',
      };
    }

    const currentStreak = data.current_streak || 0;
    const longestStreak = data.longest_streak || 0;

    // Determine streak status
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let streakStatus: StreakInfo['streakStatus'] = 'broken';
    if (data.last_activity_date === today) {
      streakStatus = 'active';
    } else if (data.last_activity_date === yesterdayStr) {
      streakStatus = 'at_risk';
    }

    // Next milestone
    const milestones = [3, 7, 14, 30, 60, 100];
    const milestoneNames = [
      'Getting Started',
      'First Week',
      'Fortnight',
      'Monthly Champion',
      'Two Month Warrior',
      'Century Club',
    ];
    const nextMilestoneIdx = milestones.findIndex((m) => m > currentStreak);
    const daysUntilNextMilestone =
      nextMilestoneIdx >= 0 ? milestones[nextMilestoneIdx] - currentStreak : 0;
    const nextMilestoneName =
      nextMilestoneIdx >= 0 ? milestoneNames[nextMilestoneIdx] : null;

    return {
      currentStreak,
      longestStreak,
      streakStatus,
      daysUntilNextMilestone,
      nextMilestoneName,
    };
  } catch {
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakStatus: 'broken',
      daysUntilNextMilestone: 3,
      nextMilestoneName: 'Getting Started',
    };
  }
}

// ── AI tip generation ─────────────────────────────────────────────────

const TIPS_DATABASE: PersonalizedTip[] = [
  {
    title: 'Visual Schedule Power',
    body: 'Try creating a visual schedule for morning routines. Research shows visual supports can reduce transition-related meltdowns by up to 45%.',
    category: 'routine',
  },
  {
    title: 'Sensory Break Timing',
    body: 'Schedule sensory breaks before your child reaches overload — not after. Proactive breaks every 45 minutes can prevent most sensory meltdowns.',
    category: 'sensory',
  },
  {
    title: 'Social Story Strategy',
    body: 'Write a short social story about an upcoming change or new experience. Reading it 3 times before the event significantly reduces anxiety.',
    category: 'social',
  },
  {
    title: 'First-Then Board',
    body: 'Use a "First-Then" board for non-preferred activities. First: brush teeth, Then: favorite show. This visual motivation technique works even with minimal verbal skills.',
    category: 'behavior',
  },
  {
    title: 'Caregiver Self-Care',
    body: 'You cannot pour from an empty cup. Even 10 minutes of quiet time daily reduces caregiver burnout risk by 30%. You deserve that break.',
    category: 'self_care',
  },
  {
    title: 'Communication Temptation',
    body: 'Place a favorite item in view but out of reach to create communication opportunities. Wait 10 seconds before prompting — give your child space to initiate.',
    category: 'communication',
  },
  {
    title: 'Token Economy Refresh',
    body: 'If your token/reward system is losing effectiveness, try refreshing the reward menu. Let your child pick 3 new rewards — choice increases motivation.',
    category: 'behavior',
  },
  {
    title: 'Calm-Down Kit',
    body: 'Build a portable calm-down kit: noise-canceling headphones, fidget toy, scented lotion, and a family photo. Having it ready prevents escalation.',
    category: 'sensory',
  },
];

function generatePersonalizedTip(
  progress: JuniorProgressSummary,
  behavior: BehaviorTrendSummary,
  childName: string
): PersonalizedTip {
  // Select tip based on this week's needs
  let category: PersonalizedTip['category'] = 'routine';

  if (behavior.topTrigger?.toLowerCase().includes('sensory')) {
    category = 'sensory';
  } else if (behavior.moodTrend === 'declining') {
    category = 'behavior';
  } else if (progress.skillsPracticed.some((s) => s.toLowerCase().includes('speech'))) {
    category = 'communication';
  } else if (behavior.totalLogs === 0 && progress.totalSessions === 0) {
    category = 'self_care';
  }

  // Find a matching tip
  const matchingTips = TIPS_DATABASE.filter((t) => t.category === category);
  const tip =
    matchingTips[Math.floor(Math.random() * matchingTips.length)] ||
    TIPS_DATABASE[0];

  return {
    ...tip,
    // Personalize the body with child's name if applicable
    body: tip.body.replace(/your child/g, childName),
  };
}

// ── CTA generation ────────────────────────────────────────────────────

function generateCTA(
  progress: JuniorProgressSummary,
  behavior: BehaviorTrendSummary,
  streak: StreakInfo
): DigestCTA {
  const baseUrl = 'https://aminy.ai';

  // Prioritize based on engagement
  if (streak.streakStatus === 'at_risk') {
    return {
      primary: {
        text: `Keep your ${streak.currentStreak}-day streak alive!`,
        url: `${baseUrl}/?screen=dashboard`,
      },
      secondary: {
        text: 'Start a quick Junior session',
        url: `${baseUrl}/?screen=junior`,
      },
    };
  }

  if (progress.totalSessions === 0) {
    return {
      primary: {
        text: 'Start a Junior session this week',
        url: `${baseUrl}/?screen=junior`,
      },
      secondary: {
        text: 'Chat with Aminy about your week',
        url: `${baseUrl}/?screen=chat`,
      },
    };
  }

  if (behavior.moodTrend === 'declining') {
    return {
      primary: {
        text: 'Chat with Aminy about strategies',
        url: `${baseUrl}/?screen=chat`,
      },
      secondary: {
        text: 'Try a CalmCorner activity',
        url: `${baseUrl}/?screen=calm-corner`,
      },
    };
  }

  return {
    primary: {
      text: 'See your full progress dashboard',
      url: `${baseUrl}/?screen=dashboard`,
    },
    secondary: {
      text: 'Explore the community',
      url: `${baseUrl}/?screen=community`,
    },
  };
}

// ── Edge function payload formatter ───────────────────────────────────

/**
 * Format digest data for the email edge function.
 * This is the shape that Resend/SendGrid templates expect.
 */
export function formatDigestForEmail(digest: WeeklyDigestData): {
  to: string;
  subject: string;
  templateData: Record<string, unknown>;
} {
  const { parentName, childName, email } = digest;

  // Build subject line
  let subject = `${childName}'s Weekly Update`;
  if (digest.juniorProgress.progressTrend === 'improving') {
    subject = `${childName} is making great progress!`;
  } else if (digest.streakInfo.streakStatus === 'active') {
    subject = `${childName}'s ${digest.streakInfo.currentStreak}-day streak continues!`;
  }

  return {
    to: email,
    subject,
    templateData: {
      parentName,
      childName,
      weekRange: `${formatDate(digest.weekStartDate)} - ${formatDate(digest.weekEndDate)}`,
      // Junior
      juniorSessions: digest.juniorProgress.totalSessions,
      juniorMinutes: digest.juniorProgress.totalMinutes,
      juniorSkills: digest.juniorProgress.skillsPracticed.join(', ') || 'None this week',
      juniorMilestones: digest.juniorProgress.newMilestones,
      juniorTrend: digest.juniorProgress.progressTrend,
      sessionsDelta: digest.juniorProgress.comparedToLastWeek.sessionsDelta,
      // Behavior
      behaviorLogs: digest.behaviorTrends.totalLogs,
      positiveBehaviors: digest.behaviorTrends.positiveBehaviors,
      moodTrend: digest.behaviorTrends.moodTrend,
      weekOverWeekChange: digest.behaviorTrends.weekOverWeekChange,
      // Community
      topPost: digest.communityHighlights.topPost,
      newReplies: digest.communityHighlights.newReplies,
      // Tip
      tipTitle: digest.aiTip.title,
      tipBody: digest.aiTip.body,
      // Streak
      currentStreak: digest.streakInfo.currentStreak,
      streakStatus: digest.streakInfo.streakStatus,
      nextMilestone: digest.streakInfo.nextMilestoneName,
      daysToMilestone: digest.streakInfo.daysUntilNextMilestone,
      // CTA
      primaryCTA: digest.callToAction.primary,
      secondaryCTA: digest.callToAction.secondary,
    },
  };
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ── Save digest record ────────────────────────────────────────────────

/**
 * Save the digest to Supabase so we don't send duplicates
 * and can show it in the app as a "Weekly Recap"
 */
export async function saveDigestRecord(digest: WeeklyDigestData): Promise<boolean> {
  try {
    const { error } = await supabase.from('weekly_digests').upsert(
      {
        user_id: digest.userId,
        week_start: digest.weekStartDate,
        week_end: digest.weekEndDate,
        digest_data: digest,
        generated_at: digest.generatedAt,
      },
      { onConflict: 'user_id,week_start' }
    );

    return !error;
  } catch {
    return false;
  }
}

/**
 * Check if a digest has already been sent for this week
 */
export async function hasDigestBeenSent(
  userId: string,
  weekStart: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('weekly_digests')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

export default {
  generateWeeklyDigest,
  formatDigestForEmail,
  saveDigestRecord,
  hasDigestBeenSent,
};
