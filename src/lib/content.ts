/**
 * Centralized UI Content for Aminy
 * All user-facing text, labels, and messages in one place
 */

export const CONTENT = {
  // App Name & Branding
  APP_NAME: 'Aminy',
  TAGLINE: 'Gentle guidance. Meaningful progress.',
  FULL_TAGLINE: 'AI Home Operating System for Neurodivergent Families',
  
  // Splash Screen
  SPLASH: {
    HEADLINE: 'Aminy: AI Home Operating System for Neurodivergent Families',
    DESCRIPTION: 'Aminy is your daily AI companion for families navigating autism—turning chaos into calm. With routines, speech & social practice, and progress reports you can share, you can breathe easier while Aminy does the heavy lifting.',
    CTA_PRIMARY: 'Start your free 7-day Core trial',
    CTA_TRIAL_NOTE: 'No credit card needed. After 7 days, you will automatically move to the Starter tier unless you upgrade.',
    CTA_SECONDARY: 'See how Aminy works',
    LOGIN_LINK: 'Already have an account?',
    LOGIN_ACTION: 'Sign in',
    FEATURE_1_TITLE: 'Build a daily plan',
    FEATURE_1_AUDIENCE: '(Caregiver)',
    FEATURE_1_DESC: 'Pick goals and times; get doable steps',
    FEATURE_2_TITLE: 'Practice & play',
    FEATURE_2_AUDIENCE: '(Child)',
    FEATURE_2_DESC: 'Fun speech, social & sensory games',
    FEATURE_3_TITLE: 'Shareable reports',
    FEATURE_3_AUDIENCE: '(School/Providers)',
    FEATURE_3_DESC: 'Progress tracking you can share',
  },
  
  // Dashboard
  DASHBOARD: {
    WELCOME: (name: string) => `Good to see you, ${name}`,
    FOCUS_CARD_TITLE: 'Your Focus Right Now',
    FOCUS_CARD_EMPTY: 'No tasks yet. Tap "Unload my mind" to get started.',
    STREAK_LABEL: 'Day Streak',
    WINS_LABEL: 'Wins This Week',
    MORE_TASKS: 'More tasks',
    COMPLETE_TASK: 'Mark complete',
    UNLOAD_MIND_BUTTON: 'Unload my mind',
    UPCOMING_SESSIONS: 'Upcoming Sessions',
    VIEW_ALL: 'View all',
  },
  
  // Proactive Nudges
  NUDGES: {
    BEDTIME: "It is 7 pm—want a bedtime visual schedule card?",
    STREAK_CELEBRATION: (days: number) => `🎉 ${days} days in a row! You are amazing!`,
    EVENING_CHECK: 'How are evenings going? I am here if you need to chat.',
    WEEKLY_REFLECTION: 'Time for your weekly reflection—what went well this week?',
    LOW_ACTIVITY: 'I noticed things have been quiet. Everything okay?',
  },
  
  // Unload Mind Modal
  UNLOAD_MIND: {
    TITLE: 'Unload your mind',
    SUBTITLE: 'Share what is on your mind. I will help organize it into next steps.',
    PLACEHOLDER: 'Type or speak freely... concerns, wins, questions, anything.',
    VOICE_BUTTON: 'Use voice',
    PHOTO_BUTTON: 'Add photo',
    SUBMIT_BUTTON: 'Send to Aminy',
    PROCESSING: 'Organizing your thoughts...',
    SUCCESS: 'Got it! I have added this to your plan.',
    ERROR: 'Could not process that. Try again?',
  },
  
  // Plan Tab
  PLAN: {
    TITLE: 'Plan',
    VISION: 'Vision',
    YEAR: 'This Year',
    QUARTER: 'This Quarter',
    MONTH: 'This Month',
    WEEK: 'This Week',
    TODAY: 'Today',
    AI_SUGGESTION: 'Aminy suggests',
    APPROVE: 'Approve',
    DECLINE: 'Not right now',
    DECLINE_REASON: 'Help me understand—why does this not fit?',
    NO_GOALS: 'No goals yet. Let us create your first one!',
  },
  
  // Coach (Care)
  COACH: {
    TITLE: 'Coach',
    WELCOME: 'I am here to help. What is on your mind?',
    VOICE_INPUT: 'Speak your question',
    PHOTO_INPUT: 'Share a photo',
    SESSION_NOTES: 'Session notes',
    ACTION_ITEMS: 'Action items',
    PROACTIVE_CHECK: 'Just checking in—how have evenings been?',
    SUMMARIZING: 'Summarizing our conversation...',
  },
  
  // Coverage Coach
  COVERAGE: {
    TITLE: 'Coverage Coach',
    INTRO: 'I will help you understand your insurance coverage in plain language.',
    QUESTION_1: 'Who is your insurance provider?',
    QUESTION_2: 'Do you have your insurance card handy?',
    QUESTION_3: 'What services are you seeking coverage for?',
    QUESTION_4: 'Have you received any denials?',
    GENERATE_SUMMARY: 'Generate coverage summary',
    EMAIL_REP: 'Email my plan rep',
    EMAIL_TEMPLATE_SUBJECT: 'Coverage inquiry for autism services',
    UPLOAD_CARD: 'Upload insurance card',
    UPLOAD_EOB: 'Upload explanation of benefits',
  },
  
  // Jr Mode
  JR: {
    TITLE: 'Aminy Jr',
    WELCOME: 'Ready to practice and play?',
    SPEECH_PRACTICE: 'Speech Practice',
    CALMING_EXERCISES: 'Calming Time',
    REWARD_EARNED: (stars: number) => `You earned ${stars} star${stars !== 1 ? 's' : ''}!`,
    PARENT_PROMPT: 'Great job! Give them a high five!',
    SESSION_COMPLETE: 'Session complete!',
    SAFETY_NOTE: 'Educational use only',
  },
  
  // Live Vision AI
  LIVE_VISION: {
    TITLE: 'Live Vision AI',
    WATERMARK: 'Educational use only',
    SESSION_LIMIT: '2 minutes remaining',
    OPT_IN_REQUIRED: 'Camera permission required',
    MICRO_CUE: 'Try saying: "I want the red block"',
    SAVING_SUMMARY: 'Saving summary to Reports...',
    ERROR_FALLBACK: 'Having trouble connecting. Try upload mode instead?',
    HIGH_LATENCY: 'Connection slow. Switching to upload mode...',
  },
  
  // Reports
  REPORTS: {
    TITLE: 'Reports',
    PARENT_VIEW: 'Parent View',
    PROVIDER_VIEW: 'Provider View',
    GENERATE_PDF: 'Generate PDF',
    SHARE_LINK: 'Share link',
    LINK_COPIED: 'Link copied! Expires in 7 days.',
    LINK_EXPIRY: 'Link expires',
    TRACK_SHARE: 'Tracking share for insights...',
  },
  
  // Vault
  VAULT: {
    TITLE: 'Vault',
    INSURANCE_CARD: 'Insurance Card',
    IEP_PLAN: 'IEP Plan',
    THERAPY_NOTES: 'Therapy Notes',
    LAST_OPENED: 'Last opened',
    LAST_SHARED: 'Last shared',
    ACCESS_LOG: 'Recent access',
    UPLOAD: 'Upload document',
  },
  
  // Telehealth
  TELEHEALTH: {
    TITLE: 'Telehealth',
    SCHEDULE_SESSION: 'Schedule session',
    SUGGEST_TIMES: 'Based on your timezone and past sessions',
    CONFIRM_BOOKING: 'Confirm booking',
    CALENDAR_INVITE: 'Calendar invite sent',
    SESSION_SUMMARY: 'Session summary',
    NEXT_STEPS: 'Recommended next steps',
  },
  
  // Settings
  SETTINGS: {
    TITLE: 'Settings',
    ACCOUNT: 'Account',
    NOTIFICATIONS: 'Notifications',
    PRIVACY: 'Privacy',
    HELP: 'Help & Support',
    LOGOUT: 'Log out',
  },
  
  // Navigation
  NAV: {
    HOME: 'Home',
    PLAN: 'Plan',
    COACH: 'Coach',
    JR: 'Jr',
    HUB: 'Hub',
    MORE: 'More',
  },
  
  // Tier Labels
  TIERS: {
    STARTER: 'Starter',
    CORE: 'Core',
    COMPLETE: 'Complete',
  },
  
  // Error Messages
  ERRORS: {
    GENERIC: 'Something went wrong. Please try again.',
    NETWORK: 'No internet connection. Check your network.',
    AUTH: 'Session expired. Please log in again.',
    PERMISSION: 'Permission denied. Check your settings.',
    NOT_FOUND: 'Page not found.',
  },
  
  // Success Messages
  SUCCESS: {
    SAVED: 'Saved successfully!',
    UPDATED: 'Updated!',
    DELETED: 'Deleted.',
    SHARED: 'Shared successfully!',
  },
} as const;

// Helper to get content with fallback
export function getContent(path: string, fallback = ''): string {
  const keys = path.split('.');
  let value: unknown = CONTENT;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return fallback;
    }
  }
  
  return typeof value === 'string' ? value : fallback;
}
