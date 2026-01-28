/**
 * Re-engagement System
 * Proactive outreach to users at risk of churning
 *
 * Win-back triggers:
 * - 3 days inactive: Gentle nudge
 * - 7 days inactive: Feature highlight + value reminder
 * - 14 days inactive: Personal message + special offer
 * - 30 days inactive: Final re-engagement attempt
 */

import { sendLocalNotification, scheduleNotification } from './push-notifications';

export type ReEngagementTrigger =
  | 'inactive_3d'
  | 'inactive_7d'
  | 'inactive_14d'
  | 'inactive_30d'
  | 'streak_at_risk'
  | 'goal_abandoned'
  | 'session_incomplete'
  | 'trial_expiring';

export interface ReEngagementCampaign {
  trigger: ReEngagementTrigger;
  title: string;
  body: string;
  cta: string;
  deepLink: string;
  emailSubject?: string;
  emailBody?: string;
}

const campaigns: Record<ReEngagementTrigger, ReEngagementCampaign> = {
  inactive_3d: {
    trigger: 'inactive_3d',
    title: 'We miss you! 💙',
    body: "It's been a few days. Ready to check in on progress?",
    cta: 'Quick Check-in',
    deepLink: '/dashboard',
    emailSubject: "How's it going?",
    emailBody: `
      <p>Hi there!</p>
      <p>We noticed you haven't checked in for a few days. That's okay – every family's journey is different.</p>
      <p>When you're ready, we're here with:</p>
      <ul>
        <li>Quick daily logging (takes just 30 seconds)</li>
        <li>Your personalized calm plan</li>
        <li>Aminy Jr. activities waiting for your child</li>
      </ul>
      <p><a href="https://app.aminy.ai/dashboard">Check in now →</a></p>
    `
  },

  inactive_7d: {
    trigger: 'inactive_7d',
    title: 'New features you might have missed ✨',
    body: 'We\'ve added some helpful tools. Come see what\'s new!',
    cta: 'See What\'s New',
    deepLink: '/whats-new',
    emailSubject: 'Some updates you might like',
    emailBody: `
      <p>Hi!</p>
      <p>We've been busy making Aminy even better for your family:</p>
      <ul>
        <li><strong>AI Coach improvements</strong> – More personalized suggestions</li>
        <li><strong>New Aminy Jr. activities</strong> – Fun ways to build calm skills</li>
        <li><strong>Visual schedules</strong> – Help transitions go smoother</li>
      </ul>
      <p>Your calm plan is waiting for you.</p>
      <p><a href="https://app.aminy.ai/dashboard">Come back and explore →</a></p>
    `
  },

  inactive_14d: {
    trigger: 'inactive_14d',
    title: 'Your calm plan misses you 💙',
    body: 'Let\'s pick up where you left off. No judgment, just support.',
    cta: 'Continue Journey',
    deepLink: '/dashboard',
    emailSubject: 'We\'re here when you\'re ready',
    emailBody: `
      <p>Hi friend,</p>
      <p>Parenting is a marathon, not a sprint. Some weeks are harder than others, and that's completely normal.</p>
      <p>Your calm plan is still here, ready when you are. No need to start over – just pick up where you left off.</p>
      <p>Even 2 minutes a day can make a difference. What if you started with just one small win today?</p>
      <p><a href="https://app.aminy.ai/dashboard">Let's do this together →</a></p>
      <p>With care,<br>The Aminy Team</p>
    `
  },

  inactive_30d: {
    trigger: 'inactive_30d',
    title: 'We haven\'t forgotten about you',
    body: 'Your journey matters. Come back anytime – we\'ll be here.',
    cta: 'Restart Journey',
    deepLink: '/onboarding/refresh',
    emailSubject: 'Your calm plan is still here',
    emailBody: `
      <p>Hi,</p>
      <p>It's been a while since we've seen you, and that's okay. Life happens.</p>
      <p>We want you to know:</p>
      <ul>
        <li>Your account is still active</li>
        <li>Your previous progress is saved</li>
        <li>You can restart fresh anytime</li>
      </ul>
      <p>If Aminy wasn't the right fit, we'd love to know why. Your feedback helps us help other families.</p>
      <p><a href="https://app.aminy.ai/feedback">Share feedback →</a></p>
      <p>Or if you're ready to try again:</p>
      <p><a href="https://app.aminy.ai/dashboard">Continue your journey →</a></p>
    `
  },

  streak_at_risk: {
    trigger: 'streak_at_risk',
    title: 'Don\'t lose your streak! 🔥',
    body: 'Quick check-in to keep your {streakCount}-day streak alive!',
    cta: 'Save Streak',
    deepLink: '/log/quick',
    emailSubject: 'Your streak is at risk!',
    emailBody: `
      <p>Your {streakCount}-day streak is about to end!</p>
      <p>A quick 30-second check-in is all it takes to keep it going.</p>
      <p><a href="https://app.aminy.ai/log/quick">Save your streak →</a></p>
    `
  },

  goal_abandoned: {
    trigger: 'goal_abandoned',
    title: 'Goal update needed',
    body: 'How\'s "{goalName}" going? Let\'s adjust if needed.',
    cta: 'Update Goal',
    deepLink: '/goals',
    emailSubject: 'How\'s your goal going?',
    emailBody: `
      <p>We noticed your goal "{goalName}" hasn't been updated recently.</p>
      <p>Goals can change – and that's okay! Would you like to:</p>
      <ul>
        <li>Mark progress on this goal</li>
        <li>Adjust the goal to be more achievable</li>
        <li>Archive it and focus on something else</li>
      </ul>
      <p><a href="https://app.aminy.ai/goals">Update your goals →</a></p>
    `
  },

  session_incomplete: {
    trigger: 'session_incomplete',
    title: 'Finish your Aminy Jr. session',
    body: '{childName} was doing great! Ready to continue?',
    cta: 'Continue Session',
    deepLink: '/jr',
    emailSubject: 'Ready to continue?',
    emailBody: `
      <p>{childName} was making great progress in Aminy Jr.!</p>
      <p>Ready to pick up where you left off?</p>
      <p><a href="https://app.aminy.ai/jr">Continue session →</a></p>
    `
  },

  trial_expiring: {
    trigger: 'trial_expiring',
    title: 'Your trial ends soon',
    body: 'Unlock all features before your trial expires.',
    cta: 'View Plans',
    deepLink: '/upgrade',
    emailSubject: 'Your Aminy trial ends in 3 days',
    emailBody: `
      <p>Your free trial is ending soon!</p>
      <p>Here's what you'll keep with a subscription:</p>
      <ul>
        <li>Unlimited AI coaching</li>
        <li>Full Aminy Jr. access</li>
        <li>Provider collaboration tools</li>
        <li>Weekly progress reports</li>
      </ul>
      <p><strong>Special offer:</strong> Subscribe now and get your first month 50% off.</p>
      <p><a href="https://app.aminy.ai/upgrade">Choose your plan →</a></p>
    `
  }
};

/**
 * Get the appropriate re-engagement campaign based on user activity
 */
export function getReEngagementCampaign(
  trigger: ReEngagementTrigger,
  context?: {
    streakCount?: number;
    goalName?: string;
    childName?: string;
  }
): ReEngagementCampaign {
  const campaign = { ...campaigns[trigger] };

  // Replace placeholders with context
  if (context) {
    if (context.streakCount) {
      campaign.body = campaign.body.replace('{streakCount}', String(context.streakCount));
      if (campaign.emailBody) {
        campaign.emailBody = campaign.emailBody.replace('{streakCount}', String(context.streakCount));
      }
    }
    if (context.goalName) {
      campaign.body = campaign.body.replace('{goalName}', context.goalName);
      if (campaign.emailBody) {
        campaign.emailBody = campaign.emailBody.replace(/{goalName}/g, context.goalName);
      }
    }
    if (context.childName) {
      campaign.body = campaign.body.replace('{childName}', context.childName);
      if (campaign.emailBody) {
        campaign.emailBody = campaign.emailBody.replace(/{childName}/g, context.childName);
      }
    }
  }

  return campaign;
}

/**
 * Trigger a re-engagement notification
 */
export function triggerReEngagement(
  trigger: ReEngagementTrigger,
  context?: {
    streakCount?: number;
    goalName?: string;
    childName?: string;
  }
): void {
  const campaign = getReEngagementCampaign(trigger, context);

  sendLocalNotification(campaign.title, campaign.body, {
    data: { route: campaign.deepLink }
  });
}

/**
 * Check user activity and determine if re-engagement is needed
 */
export function checkReEngagementNeeded(
  lastActiveDate: Date,
  currentStreakDays?: number,
  trialEndDate?: Date
): ReEngagementTrigger | null {
  const now = new Date();
  const daysSinceActive = Math.floor(
    (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check trial expiring first (highest priority)
  if (trialEndDate) {
    const daysUntilTrialEnd = Math.floor(
      (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilTrialEnd <= 3 && daysUntilTrialEnd > 0) {
      return 'trial_expiring';
    }
  }

  // Check streak at risk (before inactivity triggers)
  if (currentStreakDays && currentStreakDays >= 3) {
    // If user hasn't logged today and it's after 6 PM
    const hours = now.getHours();
    if (daysSinceActive === 0 && hours >= 18) {
      // Actually check if they've logged TODAY
      return 'streak_at_risk';
    }
  }

  // Check inactivity levels
  if (daysSinceActive >= 30) return 'inactive_30d';
  if (daysSinceActive >= 14) return 'inactive_14d';
  if (daysSinceActive >= 7) return 'inactive_7d';
  if (daysSinceActive >= 3) return 'inactive_3d';

  return null;
}

/**
 * Schedule re-engagement sequence for a user
 * Called when user activity drops or at key moments
 */
export async function scheduleReEngagementSequence(
  userId: string,
  childName?: string
): Promise<void> {
  const now = new Date();

  // Schedule 3-day nudge
  const day3 = new Date(now);
  day3.setDate(day3.getDate() + 3);
  day3.setHours(10, 0, 0, 0); // 10 AM

  await scheduleNotification(userId, {
    userId,
    title: campaigns.inactive_3d.title,
    body: campaigns.inactive_3d.body,
    scheduledFor: day3,
    type: 'custom',
    data: { trigger: 'inactive_3d', childName }
  });

  // Schedule 7-day feature highlight
  const day7 = new Date(now);
  day7.setDate(day7.getDate() + 7);
  day7.setHours(10, 0, 0, 0);

  await scheduleNotification(userId, {
    userId,
    title: campaigns.inactive_7d.title,
    body: campaigns.inactive_7d.body,
    scheduledFor: day7,
    type: 'custom',
    data: { trigger: 'inactive_7d', childName }
  });
}

/**
 * Calculate optimal send time for user based on their activity patterns
 */
export function getOptimalSendTime(
  activityHistory: Array<{ timestamp: Date; type: string }>
): { hour: number; minute: number } {
  if (activityHistory.length === 0) {
    return { hour: 10, minute: 0 }; // Default 10 AM
  }

  // Analyze what hours user is typically active
  const hourCounts: Record<number, number> = {};

  activityHistory.forEach(activity => {
    const hour = activity.timestamp.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Find the most active hour
  let maxCount = 0;
  let optimalHour = 10;

  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCount) {
      maxCount = count;
      optimalHour = parseInt(hour);
    }
  });

  return { hour: optimalHour, minute: 0 };
}

/**
 * Win-back email HTML template
 */
export function generateWinBackEmailHTML(
  campaign: ReEngagementCampaign,
  userName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${campaign.emailSubject || campaign.title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #334155;
          max-width: 600px;
          margin: 0 auto;
          padding: 0;
          background: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 16px;
          margin: 20px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .header {
          background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
          color: white;
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 32px 24px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
          color: white !important;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 24px 0;
        }
        .footer {
          background: #f8fafc;
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
        .footer a {
          color: #0891b2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💙 Aminy</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          ${campaign.emailBody || `<p>${campaign.body}</p>`}
          <div style="text-align: center;">
            <a href="https://app.aminy.ai${campaign.deepLink}" class="cta-button">
              ${campaign.cta}
            </a>
          </div>
        </div>
        <div class="footer">
          <p>Guided by AI. Grounded in ABA. Built for Family Life.</p>
          <p>
            <a href="https://app.aminy.ai/preferences/notifications">Notification Settings</a> •
            <a href="https://app.aminy.ai/unsubscribe">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default {
  campaigns,
  getReEngagementCampaign,
  triggerReEngagement,
  checkReEngagementNeeded,
  scheduleReEngagementSequence,
  getOptimalSendTime,
  generateWinBackEmailHTML
};
