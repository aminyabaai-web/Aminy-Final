/**
 * Personalized Notification Templates
 *
 * Context-aware notification content that references:
 * - Child's name
 * - Time of day
 * - Recent activities
 * - Sleep data
 * - Streak status
 *
 * These are used by the server-side push notification cron job.
 */

export interface NotificationContext {
  childName: string;
  parentName: string;
  streak: number;
  lastSleepHours?: number;
  lastSleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  recentConcern?: string;
  hasCompletedTodaysTasks?: boolean;
  missedDays?: number;
}

export interface NotificationTemplate {
  title: string;
  body: string;
  action?: string;
  url?: string;
}

type TimeOfDay = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'early_morning';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Morning check-in notifications
 */
export function getMorningNotification(ctx: NotificationContext): NotificationTemplate {
  const templates = [
    {
      title: `Good morning! ☀️`,
      body: `Ready to start ${ctx.childName}'s day? I have some ideas for smooth morning transitions.`,
      action: 'See morning tips',
    },
    {
      title: `${ctx.parentName}, quick morning prep`,
      body: `Set ${ctx.childName} up for success today. One tip can make all the difference.`,
      action: 'Get today\'s tip',
    },
    {
      title: `Morning mission ready`,
      body: `${ctx.childName}'s personalized morning routine is waiting. Let's make it a great day!`,
      action: 'Start routine',
    },
  ];

  // If poor sleep, adjust message
  if (ctx.lastSleepQuality === 'poor' || (ctx.lastSleepHours && ctx.lastSleepHours < 7)) {
    return {
      title: `Heads up for today`,
      body: `${ctx.childName} may need extra support today after a shorter night. I've got strategies ready.`,
      action: 'See strategies',
    };
  }

  // If streak is high, celebrate
  if (ctx.streak >= 7) {
    return {
      title: `Day ${ctx.streak}! 🔥`,
      body: `Amazing consistency with ${ctx.childName}. Keep the momentum going today!`,
      action: 'Continue streak',
    };
  }

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Afternoon check-in notifications
 */
export function getAfternoonNotification(ctx: NotificationContext): NotificationTemplate {
  const templates = [
    {
      title: `Afternoon check-in`,
      body: `How's ${ctx.childName}'s day going? I'm here if you need a strategy.`,
      action: 'Chat with Aminy',
    },
    {
      title: `Post-school tip`,
      body: `${ctx.childName} may need decompression time. Here's a quick sensory break idea.`,
      action: 'See tip',
    },
    {
      title: `Quick win opportunity`,
      body: `3 minutes to log a win or challenge. Help me help ${ctx.childName} better.`,
      action: 'Log now',
    },
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Evening routine notifications
 */
export function getEveningNotification(ctx: NotificationContext): NotificationTemplate {
  const templates = [
    {
      title: `Evening routine prep`,
      body: `Time to start winding down with ${ctx.childName}. Consistent routines = better sleep.`,
      action: 'See routine',
    },
    {
      title: `Bedtime in 2 hours`,
      body: `Start ${ctx.childName}'s wind-down now for a smoother bedtime tonight.`,
      action: 'Get tips',
    },
    {
      title: `Today's reflection`,
      body: `Take 30 seconds to note how ${ctx.childName}'s day went. It helps me learn.`,
      action: 'Quick log',
    },
  ];

  if (!ctx.hasCompletedTodaysTasks) {
    return {
      title: `Almost there!`,
      body: `${ctx.childName}'s daily tasks are almost done. Finish strong!`,
      action: 'Complete tasks',
    };
  }

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Streak reminder notifications
 */
export function getStreakReminderNotification(ctx: NotificationContext): NotificationTemplate {
  if (ctx.missedDays === 1) {
    return {
      title: `We miss you! 💙`,
      body: `${ctx.childName}'s progress tracker is waiting. Jump back in today!`,
      action: 'Continue journey',
    };
  }

  if (ctx.missedDays && ctx.missedDays >= 3) {
    return {
      title: `Still here for you`,
      body: `Life gets busy. When you're ready, ${ctx.childName}'s support is just a tap away.`,
      action: 'Come back',
    };
  }

  return {
    title: `Keep the streak alive! 🔥`,
    body: `You're on day ${ctx.streak}! One quick check-in keeps ${ctx.childName}'s momentum going.`,
    action: 'Check in',
  };
}

/**
 * Win celebration notifications
 */
export function getWinCelebrationNotification(
  ctx: NotificationContext,
  winDescription: string
): NotificationTemplate {
  return {
    title: `🎉 Win for ${ctx.childName}!`,
    body: winDescription,
    action: 'Celebrate & share',
  };
}

/**
 * Crisis support notification (high priority)
 */
export function getCrisisSupportNotification(ctx: NotificationContext): NotificationTemplate {
  return {
    title: `Support is here`,
    body: `Tough moment with ${ctx.childName}? I have immediate calming strategies. You've got this.`,
    action: 'Get help now',
    url: '/calm-tools',
  };
}

/**
 * Weekly summary notification
 */
export function getWeeklySummaryNotification(ctx: NotificationContext): NotificationTemplate {
  return {
    title: `${ctx.childName}'s weekly recap`,
    body: `See this week's progress, wins, and personalized recommendations.`,
    action: 'View report',
    url: '/reports/weekly',
  };
}

/**
 * Telehealth reminder notification
 */
export function getTelehealthReminderNotification(
  ctx: NotificationContext,
  providerName: string,
  timeString: string
): NotificationTemplate {
  return {
    title: `Session in 15 minutes`,
    body: `Your call with ${providerName} about ${ctx.childName} starts soon.`,
    action: 'Join call',
    url: '/telehealth/join',
  };
}

/**
 * Get the right notification based on time and context
 */
export function getContextualNotification(ctx: NotificationContext): NotificationTemplate {
  const timeOfDay = getTimeOfDay();

  switch (timeOfDay) {
    case 'early_morning':
    case 'morning':
      return getMorningNotification(ctx);
    case 'afternoon':
      return getAfternoonNotification(ctx);
    case 'evening':
      return getEveningNotification(ctx);
    default:
      // Night - no notifications unless urgent
      return getStreakReminderNotification(ctx);
  }
}

/**
 * Notification scheduling configuration
 */
export const NOTIFICATION_SCHEDULE = {
  morningCheckIn: {
    hour: 7,
    minute: 30,
    timezone: 'user', // Use user's timezone
  },
  afternoonNudge: {
    hour: 14,
    minute: 0,
    timezone: 'user',
  },
  eveningRoutine: {
    hour: 18,
    minute: 30,
    timezone: 'user',
  },
  streakReminder: {
    // Sent if no activity by this time
    hour: 20,
    minute: 0,
    timezone: 'user',
  },
};

export default {
  getMorningNotification,
  getAfternoonNotification,
  getEveningNotification,
  getStreakReminderNotification,
  getWinCelebrationNotification,
  getCrisisSupportNotification,
  getWeeklySummaryNotification,
  getTelehealthReminderNotification,
  getContextualNotification,
  NOTIFICATION_SCHEDULE,
};
